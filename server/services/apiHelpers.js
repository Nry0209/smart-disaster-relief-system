const inventoryService = require('./inventoryService');
const donationService = require('./donationService');
const resourceRequestService = require('./resourceRequestService');

const seedAllSampleData = async () => {
  const inventory = await inventoryService.seedInventory();
  const donations = await donationService.seedDonations();
  const resourceRequests = await resourceRequestService.seedResourceRequests();

  return { inventory, donations, resourceRequests };
};

module.exports = {
  ...inventoryService,
  ...donationService,
  ...resourceRequestService,
  seedAllSampleData,
};
