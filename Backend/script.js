const bcrypt = require("bcryptjs");

(async () => {
  const plainPassword = "admin123";
  const hashedPassword = "$2b$10$oE0vQNMSYTc5.7enEQ0Kuu0FR2XATxO9w3Juu.r7XFh33aLnzvK/W";

  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  console.log("Password Match:", isMatch);
})();
