const mongoose = require('mongoose');

const resourceRequestSchema = new mongoose.Schema({
  requestCode: {
    type: String,
    required: [true, 'Request code is required'],
    unique: true,
    trim: true,
  },
  requesterName: {
    type: String,
    required: [true, 'Requester name is required'],
    trim: true,
  },
  requesterEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  disasterType: {
    type: String,
    trim: true,
  },
  requesterPhone: {
    type: String,
    trim: true,
  },
  organization: {
    type: String,
    trim: true,
  },
  requestType: {
    type: String,
    required: [true, 'Request type is required'],
    enum: ['Emergency', 'Regular', 'NGO_Request'],
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Partially_Fulfilled', 'Fulfilled', 'Rejected'],
    default: 'Pending',
  },
  urgencyLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  location: {
    type: String,
    trim: true,
  },
  deliveryAddress: {
    type: String,
    trim: true,
  },
  neededBy: {
    type: Date,
  },
  description: {
    type: String,
    trim: true,
  },
  totalItemsRequested: {
    type: Number,
    default: 0,
    min: 0,
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
    quantityRequested: {
      type: Number,
      required: true,
      min: 1,
    },
    quantityApproved: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantityFulfilled: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  }],
  allocations: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
    },
    warehouseLocation: {
      type: String,
      trim: true,
    },
    allocatedQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    allocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    allocationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Allocated', 'Dispatched', 'Delivered'],
      default: 'Allocated',
    },
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('ResourceRequest', resourceRequestSchema);
