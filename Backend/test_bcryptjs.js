const bcrypt = require("bcryptjs");
const password = "test123";

bcrypt.hash(password, 10, (err, hash) => {
    if (err) console.error("Error hashing password:", err);
    console.log("Hashed Password:", hash);

    bcrypt.compare(password, hash, (err, result) => {
        if (err) console.error("Error comparing password:", err);
        console.log("Password Match:", result);
    });
});

