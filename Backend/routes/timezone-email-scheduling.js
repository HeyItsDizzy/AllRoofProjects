// Backend route for timezone-aware email scheduling
// Add this to your existing email routes file

/**
 * Schedule email delivery at recipient's local time
 * POST /api/emails/schedule-recipient-time
 */
app.post('/api/emails/schedule-recipient-time', authenticateToken, async (req, res) => {
  try {
    const {
      scheduledTime,        // UTC ISO string from frontend
      recipientTimezone,    // Detected timezone
      recipientLocalTime,   // Local time string (e.g., "06:00")
      recipientLocalDate,   // Local date string
      clientData,          // Client information
      projectData,         // Project information
      emailTemplate,       // Email template type
      emailData           // Email content data
    } = req.body;

    // Validate required fields
    if (!scheduledTime || !recipientTimezone || !clientData || !emailTemplate) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['scheduledTime', 'recipientTimezone', 'clientData', 'emailTemplate']
      });
    }

    // Create email job document
    const emailJob = {
      userId: req.user.userId,
      clientId: clientData._id || clientData.id,
      projectId: projectData?._id || projectData?.id,
      
      // Scheduling information
      scheduledTime: new Date(scheduledTime), // Store as UTC
      recipientTimezone: recipientTimezone,
      recipientLocalTime: recipientLocalTime,
      recipientLocalDate: recipientLocalDate,
      
      // Email content
      template: emailTemplate,
      recipientEmail: clientData.email,
      recipientName: clientData.name,
      
      // Email data payload
      emailData: {
        ...emailData,
        // Add timezone context for email template
        deliveryTimezone: recipientTimezone,
        deliveryLocalTime: recipientLocalTime,
        deliveryLocalDate: recipientLocalDate
      },
      
      // Status tracking
      status: 'scheduled',
      createdAt: new Date(),
      attempts: 0,
      
      // Metadata
      userTimezone: req.user.timezone || 'UTC',
      scheduledBy: req.user.userId
    };

    // Insert into email jobs collection
    const result = await db.collection('emailJobs').insertOne(emailJob);

    // Schedule the job using node-cron or your preferred scheduler
    // This example assumes you have a job scheduler set up
    scheduleEmailJob(result.insertedId, new Date(scheduledTime));

    // Log the scheduling
    console.log(`Email scheduled for ${recipientLocalTime} ${recipientTimezone} (UTC: ${scheduledTime})`);

    res.json({
      success: true,
      jobId: result.insertedId,
      scheduledFor: {
        utc: scheduledTime,
        recipientLocal: `${recipientLocalDate} ${recipientLocalTime}`,
        timezone: recipientTimezone
      },
      message: `Email scheduled for ${recipientLocalTime} recipient time`
    });

  } catch (error) {
    console.error('Email scheduling error:', error);
    res.status(500).json({
      error: 'Failed to schedule email',
      details: error.message
    });
  }
});

/**
 * Get scheduled emails with timezone information
 * GET /api/emails/scheduled
 */
app.get('/api/emails/scheduled', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'scheduled' } = req.query;
    
    const skip = (page - 1) * limit;
    
    const scheduledEmails = await db.collection('emailJobs')
      .find({
        userId: req.user.userId,
        status: status
      })
      .sort({ scheduledTime: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    // Add human-readable scheduling info
    const emailsWithTimezone = scheduledEmails.map(email => ({
      ...email,
      schedulingInfo: {
        utcTime: email.scheduledTime,
        recipientLocalTime: email.recipientLocalTime,
        recipientLocalDate: email.recipientLocalDate,
        recipientTimezone: email.recipientTimezone,
        timeUntilDelivery: Math.max(0, email.scheduledTime - new Date())
      }
    }));

    const total = await db.collection('emailJobs').countDocuments({
      userId: req.user.userId,
      status: status
    });

    res.json({
      emails: emailsWithTimezone,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching scheduled emails:', error);
    res.status(500).json({
      error: 'Failed to fetch scheduled emails',
      details: error.message
    });
  }
});

/**
 * Cancel or reschedule email
 * PUT /api/emails/scheduled/:jobId
 */
app.put('/api/emails/scheduled/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { action, newScheduledTime, newRecipientLocalTime } = req.body;

    const emailJob = await db.collection('emailJobs').findOne({
      _id: new ObjectId(jobId),
      userId: req.user.userId
    });

    if (!emailJob) {
      return res.status(404).json({ error: 'Email job not found' });
    }

    if (emailJob.status !== 'scheduled') {
      return res.status(400).json({ error: 'Can only modify scheduled emails' });
    }

    let updateData = {};

    if (action === 'cancel') {
      updateData = {
        status: 'cancelled',
        cancelledAt: new Date()
      };
      // Cancel the scheduled job
      cancelEmailJob(jobId);
      
    } else if (action === 'reschedule') {
      if (!newScheduledTime) {
        return res.status(400).json({ error: 'New scheduled time required' });
      }
      
      updateData = {
        scheduledTime: new Date(newScheduledTime),
        recipientLocalTime: newRecipientLocalTime,
        modifiedAt: new Date()
      };
      
      // Reschedule the job
      rescheduleEmailJob(jobId, new Date(newScheduledTime));
    }

    await db.collection('emailJobs').updateOne(
      { _id: new ObjectId(jobId) },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: `Email ${action}d successfully`,
      jobId: jobId
    });

  } catch (error) {
    console.error('Error modifying scheduled email:', error);
    res.status(500).json({
      error: 'Failed to modify scheduled email',
      details: error.message
    });
  }
});

// Helper functions for job scheduling (implement based on your scheduler)
function scheduleEmailJob(jobId, scheduledTime) {
  // Implementation depends on your job scheduler (node-cron, bull, etc.)
  // This is a placeholder - replace with your actual scheduling logic
  console.log(`Scheduling job ${jobId} for ${scheduledTime}`);
  
  // Example with node-cron (you'd need more sophisticated logic)
  // const cronTime = convertToCronTime(scheduledTime);
  // cron.schedule(cronTime, () => {
  //   processEmailJob(jobId);
  // }, { scheduled: true, timezone: 'UTC' });
}

function cancelEmailJob(jobId) {
  // Cancel the scheduled job
  console.log(`Cancelling job ${jobId}`);
}

function rescheduleEmailJob(jobId, newTime) {
  // Reschedule the job
  console.log(`Rescheduling job ${jobId} to ${newTime}`);
}

/**
 * Process email job (called by scheduler)
 */
async function processEmailJob(jobId) {
  try {
    const emailJob = await db.collection('emailJobs').findOne({
      _id: new ObjectId(jobId)
    });

    if (!emailJob || emailJob.status !== 'scheduled') {
      return;
    }

    // Update status to processing
    await db.collection('emailJobs').updateOne(
      { _id: new ObjectId(jobId) },
      { 
        $set: { 
          status: 'processing', 
          processedAt: new Date() 
        },
        $inc: { attempts: 1 }
      }
    );

    // Send the actual email using your email service
    const emailResult = await sendEmail({
      to: emailJob.recipientEmail,
      template: emailJob.template,
      data: emailJob.emailData,
      // Add timezone context to email
      timezoneContext: {
        deliveryTimezone: emailJob.recipientTimezone,
        deliveryLocalTime: emailJob.recipientLocalTime,
        deliveryLocalDate: emailJob.recipientLocalDate
      }
    });

    // Update status based on result
    const finalStatus = emailResult.success ? 'sent' : 'failed';
    await db.collection('emailJobs').updateOne(
      { _id: new ObjectId(jobId) },
      { 
        $set: { 
          status: finalStatus,
          completedAt: new Date(),
          emailResult: emailResult
        }
      }
    );

    console.log(`Email job ${jobId} completed with status: ${finalStatus}`);

  } catch (error) {
    console.error(`Error processing email job ${jobId}:`, error);
    
    // Mark as failed
    await db.collection('emailJobs').updateOne(
      { _id: new ObjectId(jobId) },
      { 
        $set: { 
          status: 'failed',
          error: error.message,
          failedAt: new Date()
        }
      }
    );
  }
}

module.exports = {
  scheduleEmailJob,
  cancelEmailJob,
  rescheduleEmailJob,
  processEmailJob
};