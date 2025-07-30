// Create a live polling backend using Express and Socket.IO (ES module version)
// Requirements:
// - Role-based system with Teacher and Student
// - Teacher can:
//   - Create new polls (questions with options)
//   - View live results
//   - Only ask a new question if the previous one is completed
//   - Optional: Set poll duration (default 60s), kick student, view poll history
// - Student can:
//   - Join with a name (unique per tab, not globally)
//   - Answer poll question and see live results
//   - Auto timeout after 60 seconds if no response
// - Use Express + Socket.IO with import syntax

import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",") || "*"
        : "*",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",") || "*"
        : "*",
    credentials: true,
  })
);
app.use(express.json());

// In-memory store (for demonstration)
let currentPoll = null;
let students = {};
let pollResults = {};
let pastPolls = [];
let pollTimeout = null;
let chatMessages = {}; // Store chat messages by session ID
let chatParticipants = {}; // Store chat participants by session ID

// Reset poll logic
function resetPoll() {
  if (currentPoll) {
    pastPolls.push({
      ...currentPoll,
      results: pollResults,
      endTime: Date.now(),
      totalStudents: Object.keys(students).length,
      answeredStudents: Object.values(students).filter((s) => s.answered)
        .length,
    });
  }
  currentPoll = null;
  pollResults = {};
  // Reset answered status for all students
  Object.keys(students).forEach((id) => {
    if (students[id]) {
      students[id].answered = false;
    }
  });

  if (pollTimeout) {
    clearTimeout(pollTimeout);
    pollTimeout = null;
  }
}

// End current poll and broadcast results
function endPoll() {
  if (currentPoll) {
    io.emit("poll_ended", {
      results: pollResults,
      question: currentPoll.question,
      options: currentPoll.options,
    });
    resetPoll();
  }
}

// Socket.IO logic
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Student joins
  socket.on("join_student", (name) => {
    if (!name || name.trim() === "") {
      socket.emit("join_error", "Name is required");
      return;
    }

    const trimmedName = name.trim();

    // Check if this socket already has a student registered
    if (students[socket.id]) {
      console.log(
        `Student ${
          students[socket.id].name
        } re-joining with name: ${trimmedName}`
      );
      // Update the existing student's name and reset answered status
      students[socket.id].name = trimmedName;
      students[socket.id].answered = false;
      students[socket.id].joinedAt = Date.now();
    } else {
      // Check for duplicate names and create unique identifier
      const existingStudents = Object.values(students).map((s) => s.name);
      let uniqueName = trimmedName;

      // If name already exists, add a number suffix
      let counter = 1;
      while (existingStudents.includes(uniqueName)) {
        counter++;
        uniqueName = `${trimmedName} (${counter})`;
      }

      // Create new student entry
      students[socket.id] = {
        name: uniqueName,
        originalName: trimmedName,
        answered: false,
        joinedAt: Date.now(),
        tabId: socket.id, // Use socket ID as unique tab identifier
      };

      console.log(
        `New student joined: ${uniqueName} (original: ${trimmedName})`
      );
    }

    socket.emit("join_success", {
      name: students[socket.id].name,
      originalName:
        students[socket.id].originalName || students[socket.id].name,
      message:
        students[socket.id].name !== trimmedName
          ? "Name was modified to ensure uniqueness"
          : null,
    });

    // Send current poll if active
    if (currentPoll) {
      socket.emit("new_question", {
        ...currentPoll,
        timeRemaining: Math.max(
          0,
          currentPoll.startTime + currentPoll.duration * 1000 - Date.now()
        ),
      });
    }

    // Broadcast updated student count to teachers
    io.emit("student_count_update", Object.keys(students).length);
  });

  // Teacher starts new poll
  socket.on("teacher_start_poll", (pollData) => {
    // Validate poll data
    if (
      !pollData.question ||
      !pollData.options ||
      pollData.options.length < 2
    ) {
      socket.emit(
        "poll_error",
        "Invalid poll data. Question and at least 2 options required."
      );
      return;
    }

    // Check if previous poll is still active
    if (currentPoll) {
      const unansweredStudents = Object.values(students).filter(
        (s) => !s.answered
      ).length;
      if (unansweredStudents > 0) {
        socket.emit(
          "poll_error",
          `Previous poll still active. ${unansweredStudents} student(s) haven't responded yet.`
        );
        return;
      }
    }

    // Reset previous poll if exists
    resetPoll();

    currentPoll = {
      question: pollData.question.trim(),
      options: pollData.options.map((opt) => opt.trim()),
      duration: pollData.duration || 60,
      startTime: Date.now(),
      createdBy: "teacher",
    };

    // Initialize poll results
    pollResults = {};
    currentPoll.options.forEach((option) => {
      pollResults[option] = 0;
    });

    // Reset answered status for all students
    Object.keys(students).forEach((id) => {
      if (students[id]) {
        students[id].answered = false;
      }
    });

    console.log(`New poll started: ${currentPoll.question}`);

    // Broadcast new question to all clients
    io.emit("new_question", currentPoll);

    // Set auto end poll after duration
    pollTimeout = setTimeout(() => {
      console.log("Poll timed out");
      endPoll();
    }, currentPoll.duration * 1000);

    socket.emit("poll_started", currentPoll);
  });

  // Student submits answer
  socket.on("submit_answer", (answer) => {
    if (!currentPoll) {
      socket.emit("answer_error", "No active poll");
      return;
    }

    if (!students[socket.id]) {
      socket.emit("answer_error", "Please join as a student first");
      return;
    }

    if (students[socket.id].answered) {
      socket.emit("answer_error", "You have already answered this poll");
      return;
    }

    if (!currentPoll.options.includes(answer)) {
      socket.emit("answer_error", "Invalid answer option");
      return;
    }

    // Check if poll has expired
    const timeElapsed = Date.now() - currentPoll.startTime;
    if (timeElapsed > currentPoll.duration * 1000) {
      socket.emit("answer_error", "Poll has expired");
      return;
    }

    // Record the answer
    students[socket.id].answered = true;
    students[socket.id].answer = answer;
    students[socket.id].answeredAt = Date.now();

    pollResults[answer]++;

    console.log(`Student ${students[socket.id].name} answered: ${answer}`);

    // Send confirmation to student
    socket.emit("answer_submitted", {
      answer,
      results: pollResults,
      message: "Your answer has been recorded!",
    });

    // Broadcast live results to all clients
    io.emit("live_results", {
      results: pollResults,
      totalStudents: Object.keys(students).length,
      answeredStudents: Object.values(students).filter((s) => s.answered)
        .length,
    });

    // Check if all students have answered
    const allAnswered = Object.values(students).every((s) => s.answered);
    if (allAnswered && Object.keys(students).length > 0) {
      console.log("All students have answered. Ending poll.");
      endPoll();
    }
  });

  // Teacher requests current results
  socket.on("get_current_results", () => {
    if (currentPoll) {
      socket.emit("current_results", {
        poll: currentPoll,
        results: pollResults,
        totalStudents: Object.keys(students).length,
        answeredStudents: Object.values(students).filter((s) => s.answered)
          .length,
        timeRemaining: Math.max(
          0,
          currentPoll.startTime + currentPoll.duration * 1000 - Date.now()
        ),
      });
    } else {
      socket.emit("no_active_poll");
    }
  });

  // Teacher ends poll manually
  socket.on("teacher_end_poll", () => {
    if (currentPoll) {
      console.log("Teacher manually ended the poll");
      endPoll();
      socket.emit("poll_ended_by_teacher");
    } else {
      socket.emit("no_active_poll");
    }
  });

  // Teacher kicks student
  socket.on("kick_student", (studentName) => {
    const studentSocketId = Object.keys(students).find(
      (id) => students[id] && students[id].name === studentName
    );

    if (studentSocketId) {
      console.log(`Kicking student: ${studentName}`);
      io.to(studentSocketId).emit("kicked", {
        message: "You have been removed from the session by the teacher.",
      });
      delete students[studentSocketId];

      // Update student count
      io.emit("student_count_update", Object.keys(students).length);
      socket.emit("student_kicked", studentName);
    } else {
      socket.emit("kick_error", "Student not found");
    }
  });

  // Teacher gets list of connected students
  socket.on("get_students", () => {
    const studentList = Object.values(students).map((student) => ({
      name: student.name,
      answered: student.answered,
      joinedAt: student.joinedAt,
    }));
    socket.emit("students_list", studentList);
  });

  // Teacher views past polls
  socket.on("get_past_polls", () => {
    socket.emit("past_polls", pastPolls);
  });

  // Get server status
  socket.on("get_status", () => {
    socket.emit("server_status", {
      connectedStudents: Object.keys(students).length,
      activePoll: currentPoll
        ? {
            question: currentPoll.question,
            options: currentPoll.options,
            timeRemaining: Math.max(
              0,
              currentPoll.startTime + currentPoll.duration * 1000 - Date.now()
            ),
          }
        : null,
      totalPastPolls: pastPolls.length,
    });
  });

  // =============================================
  // CHAT FUNCTIONALITY
  // =============================================

  // User joins chat room
  socket.on("join-chat", (data) => {
    const { sessionId, user } = data;
    console.log(`🔥 User joining chat: ${user} in session ${sessionId}`);

    // Initialize session if it doesn't exist
    if (!chatMessages[sessionId]) {
      chatMessages[sessionId] = [];
    }
    if (!chatParticipants[sessionId]) {
      chatParticipants[sessionId] = [];
    }

    // Join the socket room
    socket.join(`chat-${sessionId}`);

    // Add participant if not already present
    const existingParticipant = chatParticipants[sessionId].find(
      (p) => p.name === user
    );
    if (!existingParticipant) {
      chatParticipants[sessionId].push({
        id: socket.id,
        name: user,
        joinedAt: Date.now(),
      });
      console.log(`✅ ${user} added to chat room ${sessionId}`);
    }

    // Send chat history to the newly joined user
    socket.emit("chat-history", chatMessages[sessionId]);
    console.log(`📚 Sent chat history to ${user}:`, chatMessages[sessionId]);

    // Broadcast updated participants list to all users in the room
    io.to(`chat-${sessionId}`).emit(
      "participants-updated",
      chatParticipants[sessionId]
    );
    console.log(
      `🔥 Broadcasting updated participants for room ${sessionId}:`,
      chatParticipants[sessionId]
    );
  });

  // User sends a message
  socket.on("send-message", (data) => {
    const { sessionId, user, message } = data;
    console.log(`💬 Message from ${user} in session ${sessionId}: ${message}`);

    // Create message object
    const messageObj = {
      id: Date.now() + Math.random(), // Simple ID generation
      user: user,
      message: message,
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Store message
    if (!chatMessages[sessionId]) {
      chatMessages[sessionId] = [];
    }
    chatMessages[sessionId].push(messageObj);

    // Broadcast message to all users in the room
    io.to(`chat-${sessionId}`).emit("new-message", messageObj);
    console.log(
      `🔥 Broadcasting message to room chat-${sessionId}:`,
      messageObj
    );
  });

  // Teacher kicks user from chat
  socket.on("kick-user", (data) => {
    const { sessionId, userName } = data;
    console.log(`🚫 Kick request for ${userName} in session ${sessionId}`);

    // Find the participant
    if (chatParticipants[sessionId]) {
      const participantIndex = chatParticipants[sessionId].findIndex(
        (p) => p.name === userName
      );

      if (participantIndex !== -1) {
        const participant = chatParticipants[sessionId][participantIndex];

        // Remove from participants list
        chatParticipants[sessionId].splice(participantIndex, 1);

        // Notify the kicked user
        io.to(participant.id).emit("user-kicked", {
          message: `You have been removed from the chat by the teacher.`,
          userName: userName,
        });

        // Broadcast updated participants list
        io.to(`chat-${sessionId}`).emit(
          "participants-updated",
          chatParticipants[sessionId]
        );

        console.log(`✅ ${userName} kicked from chat room ${sessionId}`);
      }
    }
  });

  // User leaves chat
  socket.on("leave-chat", (data) => {
    const { sessionId, user } = data;
    console.log(`👋 ${user} leaving chat session ${sessionId}`);

    // Remove from participants
    if (chatParticipants[sessionId]) {
      chatParticipants[sessionId] = chatParticipants[sessionId].filter(
        (p) => p.id !== socket.id
      );

      // Leave the socket room
      socket.leave(`chat-${sessionId}`);

      // Broadcast updated participants list
      io.to(`chat-${sessionId}`).emit(
        "participants-updated",
        chatParticipants[sessionId]
      );
      console.log(`✅ ${user} removed from chat room ${sessionId}`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    if (students[socket.id]) {
      console.log(`Student ${students[socket.id].name} disconnected`);
      delete students[socket.id];

      // Update student count
      io.emit("student_count_update", Object.keys(students).length);
    }

    // Remove from all chat sessions
    Object.keys(chatParticipants).forEach((sessionId) => {
      const participantIndex = chatParticipants[sessionId].findIndex(
        (p) => p.id === socket.id
      );

      if (participantIndex !== -1) {
        const participant = chatParticipants[sessionId][participantIndex];
        chatParticipants[sessionId].splice(participantIndex, 1);

        console.log(
          `🔥 Broadcasting updated participants after disconnect for room ${sessionId}`
        );
        io.to(`chat-${sessionId}`).emit(
          "participants-updated",
          chatParticipants[sessionId]
        );

        console.log(
          `✅ ${participant.name} removed from chat room ${sessionId} (disconnected)`
        );
      }
    });
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: "1.0.0",
  });
});

// REST endpoints
app.get("/", (req, res) => {
  res.json({
    message: "Live Polling System API (powered by Express + Socket.IO)",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      "/": "This endpoint",
      "/status": "Server status",
      "/polls": "Past polls history",
    },
    socketEvents: {
      student: ["join_student", "submit_answer"],
      teacher: [
        "teacher_start_poll",
        "teacher_end_poll",
        "get_current_results",
        "kick_student",
        "get_students",
        "get_past_polls",
      ],
      general: ["get_status"],
    },
  });
});

app.get("/status", (req, res) => {
  res.json({
    connectedStudents: Object.keys(students).length,
    activePoll: currentPoll
      ? {
          question: currentPoll.question,
          options: currentPoll.options,
          startTime: currentPoll.startTime,
          duration: currentPoll.duration,
          timeRemaining: Math.max(
            0,
            currentPoll.startTime + currentPoll.duration * 1000 - Date.now()
          ),
        }
      : null,
    totalPastPolls: pastPolls.length,
  });
});

app.get("/polls", (req, res) => {
  res.json({
    pastPolls: pastPolls,
    totalPolls: pastPolls.length,
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Live Polling Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Ready to handle polls and student connections!`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
