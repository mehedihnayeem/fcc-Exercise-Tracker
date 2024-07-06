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
    validate: {
      validator: function (value) {
        return value instanceof Date && !isNaN(value);
      },
      message: (props) =>
        `${props.value} is not a valid date! Date should be in yyyy-mm-dd format.`,
    },
  },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  logs: [logSchema],
});

const User = mongoose.model("User", userSchema);

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

app.get("/api/users", async (req, res) => {
  const users = await User.find({});
  try {
    res.json(users);
  } catch (error) {
    res.send(error.message);
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid user ID format" });
    }

    try {
      if (user) {
        const log = {
          description,
          duration: Number(duration),
          date: req.body.date
            ? new Date(req.body.date).toDateString()
            : new Date().toDateString(),
        };

        user.logs.push(log);

        await user.save();

        res.status(200).json({
          _id: user._id,
          username: user.username,
          date: new Date(log.date).toDateString(),
          duration: log.duration,
          description: log.description,
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
  const id = req.params._id;
  const limit = parseInt(req.query.limit) || 0;
  const from = new Date(req.query.from || 0);
  const to = new Date(req.query.to || Date.now());

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Filter logs by date range
    const filteredLogs = user.logs.filter((log) => {
      const logDate = new Date(log.date);
      return logDate >= from && logDate <= to;
    });

    // Apply limit
    const limitedLogs = limit > 0 ? filteredLogs.slice(0, limit) : filteredLogs;

    // Format logs
    const formattedLogs = limitedLogs.map((log) => ({
      description: log.description,
      duration: log.duration,
      date: new Date(log.date).toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: limitedLogs.length,
      log: formattedLogs,
    });
  } catch (error) {
    console.error("Error fetching logs:", error.message);
    res.status(500).send("Server Error");
  }
});

app.use((req, res, next) => {
  res.status(404).send("404 Not Found");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
