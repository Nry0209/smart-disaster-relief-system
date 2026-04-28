const TrackingRecord = require('../models/TrackingRecord');
const Allocation = require('../models/Allocation');
const DisasterReport = require('../models/DisasterReport');
const User = require('../models/User');

// Get all tracking records with filtering and pagination
const getAllTrackingRecords = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      disasterId, 
      allocationId,
      search 
    } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (disasterId) query.disasterId = disasterId;
    if (allocationId) query.allocationId = allocationId;
    
    if (search) {
      query.$or = [
        { transportDetails: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { currentLocation: { $regex: search, $options: 'i' } }
      ];
    }

    // Role-based filtering
    if (req.user.role === 'dmc_officer') {
      // DMC officers can only see delivered records for confirmation
      query.status = { $in: ['delivered', 'confirmed_delivered'] };
    }

    const trackingRecords = await TrackingRecord.find(query)
      .populate('allocationId', 'status notes')
      .populate('disasterId', 'disasterType location severity')
      .populate('createdBy', 'fullName email')
      .populate('confirmedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TrackingRecord.countDocuments(query);

    res.json({
      success: true,
      data: {
        trackingRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all tracking records error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tracking records'
    });
  }
};

// Get tracking record by ID
const getTrackingRecordById = async (req, res) => {
  try {
    const trackingRecord = await TrackingRecord.findById(req.params.id)
      .populate('allocationId', 'status notes items')
      .populate('disasterId', 'disasterType location severity description')
      .populate('createdBy', 'fullName email')
      .populate('confirmedBy', 'fullName email');

    if (!trackingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Tracking record not found'
      });
    }

    // Role-based access check
    if (req.user.role === 'dmc_officer' && 
        !['delivered', 'confirmed_delivered'].includes(trackingRecord.status)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { trackingRecord }
    });
  } catch (error) {
    console.error('Get tracking record by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tracking record'
    });
  }
};

// Create tracking record
const createTrackingRecord = async (req, res) => {
  try {
    const {
      allocationId,
      disasterId,
      dispatchDate,
      transportDetails,
      driverName,
      vehicleNumber,
      currentLocation
    } = req.body;

    if (!disasterId) {
      return res.status(400).json({
        success: false,
        message: 'disasterId is required'
      });
    }

    let resolvedAllocationId = null;

    if (allocationId) {
      // Validate allocation exists and is confirmed when allocationId is provided
      const allocation = await Allocation.findById(allocationId);
      if (!allocation) {
        return res.status(404).json({
          success: false,
          message: 'Allocation not found'
        });
      }

      if (allocation.status !== 'confirmed') {
        return res.status(400).json({
          success: false,
          message: 'Can only create tracking records for confirmed allocations'
        });
      }

      // Check if tracking record already exists for this allocation
      const existingRecord = await TrackingRecord.findOne({ allocationId });
      if (existingRecord) {
        return res.status(400).json({
          success: false,
          message: 'Tracking record already exists for this allocation'
        });
      }

      resolvedAllocationId = allocation._id;
    } else {
      // Fallback path: track directly from allocated disaster report plan
      const disasterReport = await DisasterReport.findById(disasterId);
      if (!disasterReport) {
        return res.status(404).json({
          success: false,
          message: 'Disaster report not found'
        });
      }

      if (disasterReport.status !== 'allocated' || !disasterReport.allocatedResources) {
        return res.status(400).json({
          success: false,
          message: 'Tracking can only be created from allocated disaster plans'
        });
      }

      const existingRecord = await TrackingRecord.findOne({
        disasterId,
        status: { $in: ['prepared', 'dispatched', 'in_transit', 'delivered', 'confirmed_delivered'] }
      });

      if (existingRecord) {
        return res.status(400).json({
          success: false,
          message: 'Tracking record already exists for this disaster allocation plan'
        });
      }
    }

    const trackingRecord = new TrackingRecord({
      allocationId: resolvedAllocationId,
      disasterId,
      createdBy: req.user.id,
      dispatchDate: dispatchDate || new Date(),
      transportDetails: transportDetails || '',
      driverName: driverName || '',
      vehicleNumber: vehicleNumber || '',
      currentLocation: currentLocation || '',
      status: 'prepared'
    });

    await trackingRecord.save();

    const populatedRecord = await TrackingRecord.findById(trackingRecord._id)
      .populate('allocationId', 'status notes')
      .populate('disasterId', 'disasterType location severity')
      .populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Tracking record created successfully',
      data: { trackingRecord: populatedRecord }
    });
  } catch (error) {
    console.error('Create tracking record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating tracking record'
    });
  }
};

// Update tracking record
const updateTrackingRecord = async (req, res) => {
  try {
    const {
      dispatchDate,
      transportDetails,
      driverName,
      vehicleNumber,
      currentLocation,
      status
    } = req.body;

    const trackingRecord = await TrackingRecord.findById(req.params.id);
    if (!trackingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Tracking record not found'
      });
    }

    // DMC officers can only update status to confirmed_delivered
    if (req.user.role === 'dmc_officer' && status !== 'confirmed_delivered') {
      return res.status(403).json({
        success: false,
        message: 'DMC officers can only confirm deliveries'
      });
    }

    // Update tracking record
    const updates = {};
    if (dispatchDate !== undefined) updates.dispatchDate = dispatchDate;
    if (transportDetails !== undefined) updates.transportDetails = transportDetails;
    if (driverName !== undefined) updates.driverName = driverName;
    if (vehicleNumber !== undefined) updates.vehicleNumber = vehicleNumber;
    if (currentLocation !== undefined) updates.currentLocation = currentLocation;
    if (status !== undefined) {
      updates.status = status;
      if (status === 'delivered') {
        updates.deliveredAt = new Date();
      }
    }

    const updatedRecord = await TrackingRecord.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('allocationId', 'status notes')
      .populate('disasterId', 'disasterType location severity')
      .populate('createdBy', 'fullName email')
      .populate('confirmedBy', 'fullName email');

    res.json({
      success: true,
      message: 'Tracking record updated successfully',
      data: { trackingRecord: updatedRecord }
    });
  } catch (error) {
    console.error('Update tracking record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating tracking record'
    });
  }
};

// Delete tracking record
const deleteTrackingRecord = async (req, res) => {
  try {
    const trackingRecord = await TrackingRecord.findById(req.params.id);
    if (!trackingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Tracking record not found'
      });
    }

    // Cannot delete records that are already delivered
    if (['delivered', 'confirmed_delivered'].includes(trackingRecord.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete delivered tracking records'
      });
    }

    await TrackingRecord.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Tracking record deleted successfully'
    });
  } catch (error) {
    console.error('Delete tracking record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting tracking record'
    });
  }
};

// Get tracking records by allocation ID
const getTrackingByAllocation = async (req, res) => {
  try {
    const trackingRecords = await TrackingRecord.find({ allocationId: req.params.allocationId })
      .populate('allocationId', 'status notes')
      .populate('disasterId', 'disasterType location severity')
      .populate('createdBy', 'fullName email')
      .populate('confirmedBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { trackingRecords }
    });
  } catch (error) {
    console.error('Get tracking by allocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tracking records'
    });
  }
};

// Get tracking records by disaster ID
const getTrackingByDisaster = async (req, res) => {
  try {
    const trackingRecords = await TrackingRecord.find({ disasterId: req.params.disasterId })
      .populate('allocationId', 'status notes')
      .populate('disasterId', 'disasterType location severity')
      .populate('createdBy', 'fullName email')
      .populate('confirmedBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { trackingRecords }
    });
  } catch (error) {
    console.error('Get tracking by disaster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tracking records'
    });
  }
};

// Update tracking status (DMC Officer confirmation)
const updateTrackingStatus = async (req, res) => {
  try {
    const { status, confirmationNotes, receivedByName } = req.body;

    if (status !== 'confirmed_delivered') {
      return res.status(400).json({
        success: false,
        message: 'DMC officers can only confirm deliveries'
      });
    }

    const trackingRecord = await TrackingRecord.findById(req.params.id);
    if (!trackingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Tracking record not found'
      });
    }

    if (trackingRecord.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Can only confirm delivered records'
      });
    }

    const updatedRecord = await TrackingRecord.findByIdAndUpdate(
      req.params.id,
      {
        status: 'confirmed_delivered',
        confirmedBy: req.user.id,
        confirmationNotes: confirmationNotes || '',
        receivedByName: receivedByName || ''
      },
      { new: true, runValidators: true }
    )
      .populate('allocationId', 'status notes')
      .populate('disasterId', 'disasterType location severity')
      .populate('createdBy', 'fullName email')
      .populate('confirmedBy', 'fullName email');

    await DisasterReport.findByIdAndUpdate(trackingRecord.disasterId, {
      status: 'resolved',
    });

    res.json({
      success: true,
      message: 'Delivery confirmed successfully',
      data: { trackingRecord: updatedRecord }
    });
  } catch (error) {
    console.error('Update tracking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating tracking status'
    });
  }
};

module.exports = {
  getAllTrackingRecords,
  getTrackingRecordById,
  createTrackingRecord,
  updateTrackingRecord,
  deleteTrackingRecord,
  getTrackingByAllocation,
  getTrackingByDisaster,
  updateTrackingStatus
};
