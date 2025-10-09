const axios = require('axios');

class SMSService {
  constructor() {
    this.username = process.env.CLICKSEND_USERNAME;
    this.apiKey = process.env.CLICKSEND_API_KEY;
    this.senderId = process.env.CLICKSEND_SENDER_ID || 'AllRoofTakeoffs';
    this.baseUrl = 'https://rest.clicksend.com/v3';
    
    if (!this.username || !this.apiKey) {
      console.warn('⚠️ ClickSend credentials not configured. SMS functionality will be disabled.');
    }
  }

  /**
   * Generate a 4-digit verification code
   */
  generateVerificationCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Send SMS via ClickSend API
   * @param {string} to - Phone number in international format (e.g., +61412345678)
   * @param {string} message - SMS message content
   * @param {string} region - Country region for phone number formatting
   */
  async sendSMS(to, message, region = 'AU') {
    console.log('🔍 SMS Service: Starting SMS send process...');
    console.log('🔍 SMS Service: Credentials check:', {
      hasUsername: !!this.username,
      hasApiKey: !!this.apiKey,
      username: this.username,
      apiKeyPrefix: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : null
    });

    if (!this.username || !this.apiKey) {
      throw new Error('ClickSend credentials not configured');
    }

    try {
      // Clean phone number - ensure it starts with + and contains only digits
      const cleanedPhone = this.cleanPhoneNumber(to, region);
      
      console.log('🔍 SMS Service: Phone number formatting:', {
        originalPhone: to,
        region: region,
        cleanedPhone: cleanedPhone
      });

      const payload = {
        messages: [
          {
            source: 'node',
            from: this.senderId,
            to: cleanedPhone,
            body: message,
          }
        ]
      };

      console.log('🔍 SMS Service: Payload being sent:', JSON.stringify(payload, null, 2));

      const auth = Buffer.from(`${this.username}:${this.apiKey}`).toString('base64');
      
      console.log('🔍 SMS Service: Making request to ClickSend API...');
      const response = await axios.post(`${this.baseUrl}/sms/send`, payload, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ SMS Service: ClickSend API Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      console.log('📱 SMS sent successfully:', {
        to: cleanedPhone,
        region: region,
        messageId: response.data?.data?.messages?.[0]?.message_id,
        status: response.data?.data?.messages?.[0]?.status,
        cost: response.data?.data?.messages?.[0]?.message_price
      });

      return {
        success: true,
        messageId: response.data?.data?.messages?.[0]?.message_id,
        status: response.data?.data?.messages?.[0]?.status,
        cost: response.data?.data?.messages?.[0]?.message_price
      };

    } catch (error) {
      console.error('❌ SMS Service: Detailed error information:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers,
        requestConfig: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        },
        region: region
      });

      throw new Error(`Failed to send SMS: ${error.response?.data?.response_msg || error.message}`);
    }
  }

  /**
   * Send verification code via SMS
   * @param {string} phoneNumber - Phone number to send code to
   * @param {string} code - Verification code
   * @param {string} region - Country region for phone number formatting
   */
  async sendVerificationCode(phoneNumber, code, region = 'AU') {
    const message = `Your AllRoof verification code is: ${code}. This code will expire in 10 minutes.`;
    return await this.sendSMS(phoneNumber, message, region);
  }

  /**
   * Clean and format phone number for international use
   * @param {string} phoneNumber - Raw phone number input
   * @param {string} region - Country region (AU, US, NO)
   */
  cleanPhoneNumber(phoneNumber, region = 'AU') {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Country code mappings
    const countryMappings = {
      'AU': { code: '+61', localPrefix: '0' },
      'US': { code: '+1', localPrefix: '1' },
      'NO': { code: '+47', localPrefix: '' }
    };
    
    const mapping = countryMappings[region.toUpperCase()];
    if (!mapping) {
      throw new Error(`Unsupported region: ${region}. Supported regions: AU, US, NO`);
    }
    
    // If it already starts with +, return as-is (assuming it's already international)
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // Handle region-specific formatting
    if (region.toUpperCase() === 'AU') {
      // Australian numbers: 0412345678 → +61412345678
      if (cleaned.startsWith('0')) {
        cleaned = mapping.code + cleaned.substring(1);
      } else if (!cleaned.startsWith('+')) {
        cleaned = mapping.code + cleaned;
      }
    } else if (region.toUpperCase() === 'US') {
      // US numbers: 1234567890 or 11234567890 → +11234567890
      if (cleaned.startsWith('1') && cleaned.length === 11) {
        cleaned = '+' + cleaned;
      } else if (cleaned.length === 10) {
        cleaned = mapping.code + cleaned;
      } else if (!cleaned.startsWith('+')) {
        cleaned = mapping.code + cleaned;
      }
    } else if (region.toUpperCase() === 'NO') {
      // Norwegian numbers: 12345678 → +4712345678
      if (cleaned.length === 8) {
        cleaned = mapping.code + cleaned;
      } else if (!cleaned.startsWith('+')) {
        cleaned = mapping.code + cleaned;
      }
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format for specific region
   * @param {string} phoneNumber - Phone number to validate
   * @param {string} region - Country region (AU, US, NO)
   */
  isValidPhoneNumber(phoneNumber, region = 'AU') {
    try {
      const cleaned = this.cleanPhoneNumber(phoneNumber, region);
      
      // Region-specific validation patterns
      const validationPatterns = {
        'AU': /^\+61[2-9]\d{8}$/, // +61 followed by area code (2-9) and 8 digits
        'US': /^\+1[2-9]\d{9}$/, // +1 followed by area code (2-9) and 9 digits
        'NO': /^\+47[2-9]\d{7}$/ // +47 followed by 8 digits starting with 2-9
      };
      
      const pattern = validationPatterns[region.toUpperCase()];
      if (!pattern) {
        return false;
      }
      
      return pattern.test(cleaned);
    } catch (error) {
      return false;
    }
  }
}

module.exports = new SMSService();
