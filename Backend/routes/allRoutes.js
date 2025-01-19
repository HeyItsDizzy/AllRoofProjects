const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userCollection = require("../db").userCollection; // Adjust as needed


//Default Route
app.get("/", (req, res) => {
    console.log("Default route hit");
    res.status(200).send("Welcome to the API!");
  });
  
  // TEST Routes
  app.get('/test', (req, res) => {
    console.log("Test route hit");
    res.send("Server is working!");
  });
  
  app.get('/db-test', async (req, res) => {
    try {
        console.log("DB Test route hit");
        const result = await client.db("admin").command({ ping: 1 });
        res.send("Database is connected and responding!");
    } catch (err) {
        console.error("DB Test failed:", err.message);
        res.status(500).send("Database connection failed!");
    }
  });

/**
     * ==================================================
     *                       USERS
     * ==================================================
     */

// Routes
app.post("/register", async (req, res) => {
    console.log("POST /register hit"); // Logs when the route is hit
    console.log("Request body:", req.body); // Logs the incoming request body
  
    const { email, password } = req.body;
  
    try {
      if (!email || !password) {
        console.error("Email or password missing"); // Log error
        throw new Error("Email and password are required.");
      }
  
      console.log("Checking if email exists:", email); // Log email check
      const isEmailExist = await userCollection.findOne({ email });
      if (isEmailExist) {
        console.error("Email already exists:", email); // Log duplicate email
        throw new Error("This email is already in use.");
      }
  
      console.log("Hashing password"); // Log password hashing
      const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUND));
  
      const newUser = {
        email,
        password: hashedPassword,
        role: "User",
        isBlock: false,
        isDeleted: false,
      };
  
      console.log("Creating new user:", newUser); // Log new user creation
      const result = await userCollection.insertOne(newUser);
  
      console.log("User created successfully:", result); // Log successful insertion
      res.json({
        success: true,
        status: httpStatus.OK,
        message: "User registered successfully.",
        data: result,
      });
    } catch (err) {
      console.error("Error in /register route:", err.message); // Log any caught errors
      res.status(httpStatus.BAD_REQUEST).json({ success: false, message: err.message });
    }
  });
  
  app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await userCollection.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error("Invalid email or password.");
      }
      const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_SECRET_EXPIRES_IN,
      });
      res.json({ success: true, status: httpStatus.OK, message: "Login successful.", data: { user, token } });
    } catch (err) {
      res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: err.message });
    }
  });

app.get("/get-users", authenticateToken(), authenticateAdmin(), async (req, res) => {
    console.log("GET /get-users endpoint hit");
    try {
      const users = await userCollection.find({}, { projection: { password: 0 } }).toArray();
      console.log("Users retrieved:", users);
      res.status(200).json({
        success: true,
        message: "All users retrieved successfully",
        data: users,
      });
    } catch (err) {
      console.error("Error in /get-users:", err);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve users",
        error: err.message,
      });
    }
  });
  

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });
  

  app.patch("make-admin/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const adminCreation = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { role: "Admin" }
      );

      return res.status(httpStatus.OK).json({
        success: true,
        message: "Admin created successful...!",
        data: adminCreation,
      });
    } catch (err) {
      return res.status(httpStatus.OK).json({
        success: false,
        message: err.message || "Admin creation failed, try again...",
      });
    }
  });

  app.patch("remove-admin/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const adminRemove = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { role: "User" }
      );

      return res.status(httpStatus.OK).json({
        success: true,
        message: "Admin removed successful...!",
        data: adminRemove,
      });
    } catch (err) {
      return res.status(httpStatus.OK).json({
        success: false,
        message: err.message || "Admin removed failed, try again...",
      });
    }
  });

  app.patch("block-user/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const blockUser = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { isBlock: true }
      );

      return res.status(httpStatus.OK).json({
        success: true,
        message: "User blocked successful...!",
        data: blockUser,
      });
    } catch (err) {
      return res.status(httpStatus.OK).json({
        success: false,
        message: err.message || "User block failed, try again...",
      });
    }
  });

  app.patch("unblock-user/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const adminRemove = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { isBlock: false }
      );

      return res.status(httpStatus.OK).json({
        success: true,
        message: "User blocked successful...!",
        data: adminRemove,
      });
    } catch (err) {
      return res.status(httpStatus.OK).json({
        success: false,
        message: err.message || "User unblock failed, try again...",
      });
    }
  });

  app.patch("delete-user/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const deleteUser = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { isDeleted: true }
      );

      return res.status(httpStatus.OK).json({
        success: true,
        message: "User deleted successfully...!",
        data: deleteUser,
      });
    } catch (err) {
      return res.status(httpStatus.OK).json({
        success: false,
        message: err.message || "User delete failed, try again...",
      });
    }
  });

  /**
   * ==================================================
   *                       PROJECTS
   * ==================================================
   */

  app.post(
    "/add-projects",
    authenticateToken(),
    authenticateAdmin(),
    async (req, res) => {
      try {
        const projects = req.body;

        const result = await projectsCollection.insertMany(projects);

        return res.json({
          success: true,
          status: httpStatus.OK,
          message: "All projects added successfully",
          data: result,
        });
      } catch (err) {
        return res.json({
          success: false,
          status: httpStatus.NO_CONTENT,
          message: "projects added failed",
          data: err,
        });
      }
    }
  );

  // Add new project
  app.post("/addProject", authenticateToken(), async (req, res) => {
    const project = req.body;

    try {
      console.log("Project data:", project);
      const assignUserId = project.assignedOn?._id;

      // Default project status
      project.status = "running";

      // Insert project into the collection
      const result = await projectsCollection.insertOne(project);

      console.log("Inserted project:", result.insertedId);

      // If the project is assigned to a user, update user's project count
      if (project.assignedOn) {
        const user = await userCollection.findOne({
          _id: new ObjectId(assignUserId),
        });

        if (user) {
          const projectAssign = (user.projectAssign || 0) + 1; // Default to 0 if undefined
          console.log("User projectAssign count:", projectAssign);

          const updateUserData = await userCollection.updateOne(
            { _id: new ObjectId(assignUserId) },
            { $set: { projectAssign: projectAssign } }
          );

          console.log("Updated user data:", updateUserData);
        } else {
          console.log("User not found for ID:", assignUserId);
        }
      }

      // Fetch and return the inserted project data
      const projectData = await projectsCollection.findOne({
        _id: result.insertedId,
      });

      return res.status(200).json({
        success: true,
        message: "Project added successfully",
        data: projectData,
      });
    } catch (err) {
      console.error("Error adding project:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to add project",
        error: err.message,
      });
    }
  });

  // update porject status
  app.put(
    "/updateProjectToComplete/:id",
    authenticateToken(),
    async (req, res) => {
      const projectId = req.params.id; // Get project ID from the URL parameters

      try {
        // Update the project's status to "complete"
        const result = await projectsCollection.updateOne(
          { _id: new ObjectId(projectId) },
          { $set: { status: "complete" } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Project not found or already completed",
          });
        }

        const updatedProject = await projectsCollection.findOne({
          _id: new ObjectId(projectId),
        });

        return res.status(200).json({
          success: true,
          message: "Project marked as complete",
          data: updatedProject,
        });
      } catch (error) {
        console.error("Error updating project status:", error);
        return res.status(500).json({
          success: false,
          message: "An error occurred while updating the project status",
        });
      }
    }
  );

  // get projects
  app.get("/get-projects", authenticateToken(), async (req, res) => {
    try {
      const { search, startDate } = req.query;
      let query = {};

      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
            { posting_date: { $regex: search, $options: "i" } },
            { cost: { $regex: search, $options: "i" } },
            { dateline: { $regex: search, $options: "i" } },
            { summary: { $regex: search, $options: "i" } },
          ],
        };
      }

      if (startDate) {
        query.posting_date = { $gte: new Date(startDate) };
      }

      const result = await projectsCollection.find(query).toArray();
      return res.json({
        success: true,
        status: httpStatus.OK,
        message: "Projects retrieved successfully",
        data: result,
      });
    } catch (err) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve projects",
        error: err.message,
      });
    }
  });

  app.get("/get-project/:id", authenticateToken(), async (req, res) => {
    try {
      const { id } = req.params; // Extract project ID from request parameters

      // Check if the ID is a valid MongoDB ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid project ID format",
        });
      }

      // Fetch the project by ID from the projects collection
      const project = await projectsCollection.findOne({
        _id: new ObjectId(id),
      });

      // If no project is found, return an error
      if (!project) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: "Project not found",
        });
      }

      // Return the project details
      return res.json({
        success: true,
        status: httpStatus.OK,
        message: "Project retrieved successfully",
        data: project,
      });
    } catch (err) {
      // Handle server errors
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
        error: err.message,
      });
    }
  });

  app.get("/get-projects/:id", authenticateToken(), async (req, res) => {
    try {
      const { id } = req.params; // Extract user ID from request parameters

      // Check if the ID is a valid MongoDB ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid user ID format",
        });
      }

      // Fetch all projects for the given user ID from the projects collection
      const projects = await projectsCollection
        .find({
          userId: id, // Assuming userId is stored as an ObjectId
        })
        .toArray();

      // If no projects are found, return an error
      if (!projects || projects.length === 0) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: "No projects found for this user",
        });
      }

      // Return the list of projects
      return res.json({
        success: true,
        status: httpStatus.OK,
        message: "Projects retrieved successfully",
        data: projects,
      });
    } catch (err) {
      // Handle server errors
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
        error: err.message,
      });
    }
  });

  app.get(
    "/get-projects/:assignedId",
    // authenticateToken(),
    async (req, res) => {
      try {
        const { assignedId } = req.params; // Extract assigned ID from request parameters

        // Use MongoDB's find() with a query on assignedOn._id
        const projects = await projectsCollection
          .find({ "assignedOn._id": assignedId })
          .toArray();

        // Return the project details
        return res.json({
          success: true,
          status: 200,
          message: "Projects retrieved successfully",
          data: projects,
        });
      } catch (err) {
        // Handle server errors
        return res.status(500).json({
          success: false,
          message: "Something went wrong",
          error: err.message,
        });
      }
    }
  );

  // Endpoint for file upload
  app.post("/upload-file/:id", upload.single("file"), async (req, res) => {
    try {
      // Ensure a file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      // Get the unique file name
      const { originalname, uniqueFileName } = req.file;

      // Save file information to MongoDB
      const fileData = {
        fileName: originalname, // Original file name
        uniqueFileName, // Unique file name saved on the server
      };

      const updateResult = await projectsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $push: { files: fileData } }
      );

      // Respond with success and file details
      res.json({
        success: true,
        message: "File uploaded successfully!",
        file: updateResult, // Return file details in the response
      });
    } catch (error) {
      console.error("File upload error:", error);
      res
        .status(500)
        .json({ error: "File upload failed.", details: error.message });
    }
  });

  // Middleware to serve uploaded files
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  app.get("/download-file/:uniqueFileName", async (req, res) => {
    try {
      const uniqueFileName = req.params.uniqueFileName;

      // Construct the file path
      const filePath = path.join(__dirname, "uploads", uniqueFileName);

      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found." });
      }

      // Send the file as a download response
      res.download(filePath, uniqueFileName, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          return res.status(404).json({ error: "File not found." });
        }
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      res
        .status(500)
        .json({ error: "Internal server error.", details: error.message });
    }
  });

  app.patch(
    "/asignUser/:projectId",
    authenticateToken(),
    authenticateAdmin(),
    async (req, res) => {
      try {
        const { projectId } = req.params;
        const assignedOn = req.body;

        if (!ObjectId.isValid(projectId)) {
          return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Invalid project ID format",
          });
        }

        const project = await projectsCollection.findOne({
          _id: new ObjectId(projectId),
        });
        if (!project) {
          return res.status(httpStatus.NOT_FOUND).json({
            success: false,
            message: "Project not found",
          });
        }

        // Perform the update
        const updatedProject = await projectsCollection.updateOne(
          { _id: new ObjectId(projectId) },
          { $set: { assignedOn } }
        );

        const user = await userCollection.findOne({
          _id: new ObjectId(`${assignedOn._id}`),
        });

        const projectAssign = user.projectAssign + 1;
        const updateUserData = await userCollection.updateOne(
          { _id: new ObjectId(`${assignedOn._id}`) },
          { $set: { projectAssign: projectAssign } }
        );
        if (updatedProject.modifiedCount === 0) {
          return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to assign user to the project",
          });
        }

        return res.status(httpStatus.OK).json({
          success: true,
          message: "User assigned to project successfully",
        });
      } catch (err) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: err.message || "Something went wrong",
        });
      }
    }
  );