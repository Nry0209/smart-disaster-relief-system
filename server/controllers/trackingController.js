const TrackingRecord = require('../models/TrackingRecord');
const Allocation = require('../models/Allocation');
const DisasterReport = require('../models/DisasterReport');
const TransportAsset = require('../models/TransportAsset');

const FINAL_TRACKING_STATUSES = new Set(['delivered', 'confirmed_delivered']);

const DEFAULT_TRANSPORT_ASSETS = [
  { transportType: 'Refrigerated Truck', driverName: 'Kumara Bandara', vehicleNumber: 'WP-CA-1234' },
  { transportType: 'Emergency Vehicle', driverName: 'Nimal Perera', vehicleNumber: 'WP-CB-5678' },
  { transportType: 'Heavy Truck', driverName: 'Sunil Fernando', vehicleNumber: 'WP-CC-9012' },
  { transportType: 'Medium Truck', driverName: 'Rohan Silva', vehicleNumber: 'WP-CD-3456' },
  { transportType: 'Light Van', driverName: 'Chaminda Rajapaksa', vehicleNumber: 'WP-CE-7890' },
  { transportType: 'Refrigerated Truck', driverName: 'Mahinda Wijesinghe', vehicleNumber: 'WP-CF-2345' },
  { transportType: 'Emergency Vehicle', driverName: 'Saman Kumara', vehicleNumber: 'WP-CG-6789' },
  { transportType: 'Heavy Truck', driverName: 'Priyantha Bandara', vehicleNumber: 'WP-CH-0123' },
  { transportType: 'Medium Truck', driverName: 'Lalith Perera', vehicleNumber: 'WP-CJ-4567' },
  { transportType: 'Light Van', driverName: 'Dinesh Fernando', vehicleNumber: 'WP-CK-8901' },
];

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isFinalizedTrackingStatus(status) {
  return FINAL_TRACKING_STATUSES.has(String(status || '').toLowerCase());
}

async function ensureDefaultTransportAssets() {
  const count = await TransportAsset.countDocuments();
  if (count > 0) {
    return;
  }

  await TransportAsset.insertMany(DEFAULT_TRANSPORT_ASSETS.map((asset) => ({ ...asset, isActive: true })));
}

async function findConflictForTransportAsset(transportAssetId, excludeTrackingRecordId = null) {
  if (!transportAssetId) {
    return null;
  }

  const query = {
    transportAssetId,
    status: { $nin: Array.from(FINAL_TRACKING_STATUSES) },
  };

  if (excludeTrackingRecordId) {
    query._id = { $ne: excludeTrackingRecordId };
  }

  return TrackingRecord.findOne(query).sort({ createdAt: -1 });
}

async function resolveTransportAsset({ transportAssetId, transportDetails, driverName, vehicleNumber }) {
  if (transportAssetId) {
    const asset = await TransportAsset.findById(transportAssetId);
    if (!asset || !asset.isActive) {
      const error = new Error('Selected transport asset is unavailable');
      error.status = 400;
      throw error;
    }
    return asset;
  }

  const normalizedDriverName = String(driverName || '').trim();
  const normalizedVehicleNumber = String(vehicleNumber || '').trim().toUpperCase();
  const normalizedTransportType = String(transportDetails || '').trim();

  if (!normalizedDriverName || !normalizedVehicleNumber || !normalizedTransportType) {
    const error = new Error('Select a transport asset from the database');
    error.status = 400;
    throw error;
  }

  const existingAsset = await TransportAsset.findOne({
    driverName: new RegExp(`^${escapeRegExp(normalizedDriverName)}$`, 'i'),
    vehicleNumber: normalizedVehicleNumber,
  });

  if (existingAsset) {
    return existingAsset;
  }

  return TransportAsset.create({
    transportType: normalizedTransportType,
    driverName: normalizedDriverName,
    vehicleNumber: normalizedVehicleNumber,
    isActive: true,
  });
}

async function resolveConfirmedAllocation({ allocationId, disasterId, userId }) {
  if (!disasterId) {
    const error = new Error('Disaster ID is required');
    error.status = 400;
    throw error;
  }

  const report = await DisasterReport.findById(disasterId);
  if (!report) {
    const error = new Error('Disaster report not found');
    error.status = 404;
    throw error;
  }

  // Check if disaster report has allocated status and resources
  if (report.status !== 'allocated') {
    const error = new Error('Can only create tracking records for allocated disaster reports');
    error.status = 400;
    throw error;
  }

  const lineItems = Array.isArray(report.allocatedResources?.lineItems)
    ? report.allocatedResources.lineItems
    : [];

  if (!lineItems.length) {
    const error = new Error('No allocated plan found for this disaster report');
    error.status = 400;
    throw error;
  }

  // Return a mock allocation object for compatibility
  return {
    _id: report._id, // Use disaster report ID as allocation ID
    disasterId: report._id,
    lineItems: lineItems,
    status: 'allocated',
    notes: report.allocatedResources?.message || '',
    allocatedDate: report.allocatedResources?.allocatedDate
  };
}

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

    const pendingStatuses = ['prepared', 'dispatched', 'in_transit', 'delivered'];

    // Role-based filtering
    if (req.user.role === 'dmc_officer') {
      // DMC officers work from the live pending-confirmation queue.
      // confirmed_delivered stays available only when explicitly requested.
      if (status === 'pending_confirmation') {
        query.status = { $in: pendingStatuses };
      } else if (status === 'confirmed_delivered') {
        query.status = 'confirmed_delivered';
      } else if (status && pendingStatuses.includes(status)) {
        query.status = status;
      } else {
        query.status = { $in: pendingStatuses };
      }
    }

    const trackingRecords = await TrackingRecord.find(query)
      .populate('allocationId', 'status notes')
      .populate('disasterId', 'disasterType location severity')
      .populate('transportAssetId', 'transportType driverName vehicleNumber isActive')
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
      .populate('transportAssetId', 'transportType driverName vehicleNumber isActive')
      .populate('createdBy', 'fullName email')
      .populate('confirmedBy', 'fullName email');

    if (!trackingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Tracking record not found'
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
      transportAssetId,
      currentLocation
    } = req.body;

    const allocation = await resolveConfirmedAllocation({
      allocationId,
      disasterId,
      userId: req.user.id,
    });

    // Check if tracking record already exists for this disaster report
    const existingRecord = await TrackingRecord.findOne({ disasterId: allocation.disasterId });
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: 'Tracking record already exists for this disaster report'
      });
    }

    const transportAsset = await resolveTransportAsset({
      transportAssetId,
      transportDetails,
      driverName,
      vehicleNumber,
    });

    const conflictingAssignment = await findConflictForTransportAsset(transportAsset._id);
    if (conflictingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'That transport asset is already assigned to an active tracking record. Please choose another one.'
      });
    }

    const trackingRecord = new TrackingRecord({
      allocationId: allocation._id, // Use disaster report ID as allocation ID
      disasterId: allocation.disasterId,
      createdBy: req.user.id,
      dispatchDate: dispatchDate || new Date(),
      transportAssetId: transportAsset._id,
      transportDetails: transportAsset.transportType,
      driverName: transportAsset.driverName,
      vehicleNumber: transportAsset.vehicleNumber,
      currentLocation: currentLocation || '',
      status: 'prepared'
    });

    await trackingRecord.save();

    const populatedRecord = await TrackingRecord.findById(trackingRecord._id)
      .populate('allocationId', 'status notes')
      .populate('disasterId', 'disasterType location severity')
      .populate('transportAssetId', 'transportType driverName vehicleNumber isActive')
      .populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Tracking record created successfully',
      data: { trackingRecord: populatedRecord }
    });
  } catch (error) {
    console.error('Create tracking record error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Server error while creating tracking record'
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
      transportAssetId,
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

    const hasTransportUpdate = transportAssetId !== undefined || transportDetails !== undefined || driverName !== undefined || vehicleNumber !== undefined;
    let transportAsset = null;
    if (hasTransportUpdate) {
      transportAsset = await resolveTransportAsset({
        transportAssetId: transportAssetId !== undefined ? transportAssetId : trackingRecord.transportAssetId,
        transportDetails: transportDetails !== undefined ? transportDetails : trackingRecord.transportDetails,
        driverName: driverName !== undefined ? driverName : trackingRecord.driverName,
        vehicleNumber: vehicleNumber !== undefined ? vehicleNumber : trackingRecord.vehicleNumber,
      });

      const conflict = await findConflictForTransportAsset(transportAsset._id, trackingRecord._id);
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: 'That transport asset is already assigned to an active tracking record. Please choose another one.'
        });
      }
    }

    // Update tracking record
    const updates = {};
    if (dispatchDate !== undefined) updates.dispatchDate = dispatchDate;
    if (transportAsset) {
      updates.transportAssetId = transportAsset._id;
      updates.transportDetails = transportAsset.transportType;
      updates.driverName = transportAsset.driverName;
      updates.vehicleNumber = transportAsset.vehicleNumber;
    }
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
      .populate('transportAssetId', 'transportType driverName vehicleNumber isActive')
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
      .populate('transportAssetId', 'transportType driverName vehicleNumber isActive')
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
      .populate('transportAssetId', 'transportType driverName vehicleNumber isActive')
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

    if (trackingRecord.status === 'confirmed_delivered') {
      return res.status(400).json({
        success: false,
        message: 'Record is already confirmed'
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
      .populate('transportAssetId', 'transportType driverName vehicleNumber isActive')
      .populate('createdBy', 'fullName email')
      .populate('confirmedBy', 'fullName email');

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

const getTransportAssets = async (req, res) => {
  try {
    await ensureDefaultTransportAssets();

    const assets = await TransportAsset.find({ isActive: true }).sort({ transportType: 1, driverName: 1, vehicleNumber: 1 });
    const activeAssignments = await TrackingRecord.find({
      transportAssetId: { $in: assets.map((asset) => asset._id) },
      status: { $nin: Array.from(FINAL_TRACKING_STATUSES) },
    }).select('transportAssetId');
    const activeAssetIds = new Set(activeAssignments.map((record) => String(record.transportAssetId)));

    res.json({
      success: true,
      data: {
        transportAssets: assets.map((asset) => ({
          ...asset.toObject(),
          isAvailable: !activeAssetIds.has(String(asset._id)),
        })),
      },
    });
  } catch (error) {
    console.error('Get transport assets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transport assets'
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
  updateTrackingStatus,
  getTransportAssets,
};
