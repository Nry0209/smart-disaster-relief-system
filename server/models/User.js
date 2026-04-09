const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'dmc_officer', 'inventory_officer', 'allocation_officer', 'tracking_officer', 'charity_staff'],
    default: 'charity_staff'
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  phone: {
    type: String,
    trim: true,
    default: ""
  },
  department: {
    type: String,
    trim: true,
    default: ""
  },
  profilePicture: {
    type: String,
    default: null
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  otp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// ⚠️ DEVELOPMENT MODE: Store passwords as plain text (no encryption)
// In production, uncomment the password hashing code below
/*
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});
*/

// Compare password method
userSchema.methods.comparePassword = function(candidatePassword) {
  // ⚠️ DEVELOPMENT MODE: Plain text password comparison (no encryption)
  const match = candidatePassword === this.password;
  return match;
  
  /* Production password comparison with bcrypt (commented for dev):
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(candidatePassword, this.password);
  */
};

// Hide password in JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model("User", userSchema);