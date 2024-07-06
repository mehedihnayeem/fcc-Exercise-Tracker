const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const logSchema = new mongoose.Schema({
  _id: {
    type: String,
  },
  username: {
    type: String,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
});

const User = mongoose.model("User", userSchema);
const Log = mongoose.model("Log", logSchema);

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((error) => {
    console.error("Database connection error:", error.message);
  });

app.post("/api/users", async (req, res) => {
  const { username } = req.body;
  try {
    const user = new User({ username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
  } catch (error) {
    console.log(error.message);
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.body[":_id"];
  const { description, duration, date } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid user ID format" });
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res
      .status(400)
      .send({ message: "Date must be in yyyy-mm-dd format" });
  }

  try {
    const user = await User.findById(id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid user ID format" });
    }

    try {
      if (user) {
        const log = {
          description,
          duration,
          date: date ? new Date(date) : new Date(),
        };

        user.logs.push(log);

        await user.save();

        res.status(200).json({
          _id: user._id,
          username: user.username,
          date: date,
          duration: duration,
          description: description,
        });
      }
    } catch (error) {
      res.send(error.message);
    }
  } catch (error) {
    console.log(error.message);
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const id = req.params["_id"];
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const logsCount = user.logs.length; // Count the number of logs
    const formattedLogs = user.logs.map((log) => ({
      description: log.description,
      duration: log.duration,
      date: log.date.toISOString().substring(0, 10), // Format date as yyyy-mm-dd
    }));

    res.json({
      _id: id,
      username: user.username,
      count: logsCount,
      log: formattedLogs,
    });
  } catch (error) {
    res.send(error.message);
  }
});

// app.use((req, res, next) => {
//   res.status(404).send("404 Not Found");
// });

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
