// FMindex.js

module.exports = (app) => {
  const fileRoutes = require("./routes/fileRoutes");

  // Mount file-related API routes
  app.use("/files", fileRoutes);

  // ✅ Future: Add real-time folder sync
  // ✅ Future: Mount role-based middleware here
  // ✅ Future: Init FS watcher or Cron jobs for drift correction
};
