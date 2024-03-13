const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const multer = require("multer");

const app = express();
const port = 8000;
const cors = require("cors");
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());
const jwt = require("jsonwebtoken");

mongoose
  .connect("mongodb+srv://francrodrix05:franc@cluster0.n63f7dl.mongodb.net/", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to Mongo Db");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB", err);
  });

app.listen(port, () => {
  console.log("Server running on port 8000");
});

const User = require("./models/user");
const Message = require("./models/message");

// EndPoint for Registration
app.post("/register", (req, res) => {
  const { name, email, password, image } = req.body;

  // create new user Objet
  const newUser = new User({ name, email, password, image });

  // Save user to database
  newUser
    .save()
    .then(() => {
      res.status(200).json({ message: "User refisterd succesfully" });
    })
    .catch((err) => {
      console.log("Resistering user", err);
      res.status(500).json({ message: "Error Registering the user" });
    });
});

// Function to create Token for the user
const createToken = (userId) => {
  const payload = {
    userId: userId,
  };
  const token = jwt.sign(payload, "Q$r2K6W8n!jCW%Zk", { expiresIn: "1h" });
  return token;
};

// EndPoint for login of user
app.post("/login", (req, res) => {
  console.log("loginnnn");
  const { email, password } = req.body;

  // chek if email and password provided
  if (!email || !password) {
    return res.status(404).json({ message: "Email and password required" });
  }

  // Check for user in dataBase
  User.findOne({ email })
    .then((user) => {
      if (!user) {
        // user not found
        return res.status(404).json({ message: "User not found" });
      }
      // compare password in database
      if (user.password !== password) {
        return res.status(404).json({ message: "Invalid Password" });
      }
      const token = createToken(user._id);
      res.status(200).json({ token });
    })
    .catch((err) => {
      console.log("Cant find the user", err);
      res.status(500).json({ message: "Error Logging the user" });
    });
});

// Endpoint to access all the user accept the user currently logged in

app.get("/users/:userId", (req, res) => {
  const loggedInUserId = req.params.userId;

  User.find({ _id: { $ne: loggedInUserId } })
    .then((users) => {
      console.log(users, "backusers");
      res.status(200).json(users);
    })
    .catch((err) => {
      console.log("Error retriving users", err);
      res.status(500).json({ message: "Error retriving users" });
    });
});

// Endpoint Send  Friend Request to the user

app.post("/friend-request", async (req, res) => {
  const { currentUserId, selectedUserId } = req.body;

  try {
    //update the recepient friendRequestArray
    await User.findByIdAndUpdate(selectedUserId, {
      $push: { friendRequests: currentUserId },
    });
    // update the sender sentFriendRequestArray

    await User.findByIdAndUpdate(currentUserId, {
      $push: { sentFriendRequests: selectedUserId },
    });

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

// Endpoint to show all the friend request of a particular user

app.get("/friend-request/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // fetch the user document based on userId

    const user = await User.findById(userId)
      .populate("friendRequests", "name email image")
      .lean();

    const friendRequests = user?.friendRequests;

    res.json(friendRequests);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Endpoint to accept a request of particular person

app.post("/friend-request/accept", async (req, res) => {
  try {
    const { senderId, recepientId } = req.body;

    // retrive the documents of sender and reciever
    const sender = await User.findById(senderId);
    const recepient = await User.findById(recepientId);

    sender.friends.push(recepientId);
    (await recepient).friends.push(senderId);

    recepient.friendRequests = (await recepient).friendRequests.filter(
      (request) => request.toString() !== senderId.toString()
    );

    sender.sentFriendRequests = (await sender).sentFriendRequests.filter(
      (request) => request.toString() !== recepientId.toString()
    );

    await sender.save();
    await recepient.save();

    res.status(200).json({ message: "Friend Request accepted Successfully" });
  } catch (err) {
    console.log("Error message:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// endpoint to access all the friends of logged  in User

app.get("/accepted-friends/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate(
      "friends",
      "name email image"
    );

    const acceptedFriends = user.friends;

    res.json(acceptedFriends);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// endpoit to post messages and store it in bacend
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "files/"); // Specify the desired destination folder
  },
  filename: function (req, file, cb) {
    // Generate a unique filename for the uploaded file
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.post("/messages", upload.single("imageFile"), async (req, res) => {
  try {
    const { senderId, recepientId, messageType, messageText } = req.body;

    const newMessage = new Message({
      senderId,
      recepientId,
      messageType,
      message: messageText,
      timeStamp: new Date(),
      imageUrl: messageType === "image"?req.file.path:null,
    });
    await newMessage.save();

    res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Endpoint to get the user details to design chat room headder

app.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // fetch the details of userId
    const recepientId = await User.findById(userId);

    res.json(recepientId);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Endpoint to fetch messages between two users in chat room

app.get("/messages/:senderId/:recepientId", async (req, res) => {
  try {
    const { senderId, recepientId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: senderId, recepientId: recepientId },
        { senderId: recepientId, recepientId: senderId },
      ],
    }).populate("senderId", "_id name");

    res.json(messages);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/deleteMessages", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "invalid req body!" });
    }

    await Message.deleteMany({ _id: { $in: messages } });

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server" });
  }
});


app.get("/friend-requests/sent/:userId",async(req,res) => {
  try{
    const {userId} = req.params;
    const user = await User.findById(userId).populate("sentFriendRequests","name email image").lean();

    const sentFriendRequests = user.sentFriendRequests;

    res.json(sentFriendRequests);
  } catch(error){
    console.log("error",error);
    res.status(500).json({ error: "Internal Server" });
  }
})

app.get("/friends/:userId",(req,res) => {
  try{
    const {userId} = req.params;

    User.findById(userId).populate("friends").then((user) => {
      if(!user){
        return res.status(404).json({message: "User not found"})
      }

      const friendIds = user.friends.map((friend) => friend._id);

      res.status(200).json(friendIds);
    })
  } catch(error){
    console.log("error",error);
    res.status(500).json({message:"internal server error"})
  }
})
