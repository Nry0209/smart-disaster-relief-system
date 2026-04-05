const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donorName: {
    type: String,
    required: [true, 'Donor name is required'],
    trim: true,
  },
  donorType: {
    type: String,
    trim: true,
  },
  donorEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  donorPhone: {
    type: String,
    trim: true,
  },
  donationType: {
    type: String,
    required: [true, 'Donation type is required'],
    enum: ['Monetary', 'In-Kind'],
  },
  amount: {
    type: Number,
    min: 0,
    validate: {
      validator: function(value) {
        return this.donationType === 'Monetary' ? value > 0 : true;
      },
      message: 'Amount is required for monetary donations'
    }
  },
  status: {
    type: String,
    enum: ['Pending', 'Verified', 'Rejected', 'Completed'],
    default: 'Pending',
  },
  description: {
    type: String,
    trim: true,
  },
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  donationDate: {
    type: Date,
    required: [true, 'Donation date is required'],
    default: Date.now,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  verificationDate: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  },
  items: [{
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      trim: true,
    },
    condition: {
      type: String,
      enum: ['New', 'Good', 'Fair'],
    },
    estimatedValue: {
      type: Number,
      min: 0,
    },
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Donation', donationSchema);
