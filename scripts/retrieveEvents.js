const hre = require("hardhat");

async function getPastVoucherCreatedEvents(contract) {
  const eventFilter = contract.filters.VoucherCreated(); // filter for VoucherCreated events
  const events = await contract.queryFilter(eventFilter); 
  return events;
}

async function getPastVoucherSentEvents(contract) {
  const eventFilter = contract.filters.VoucherSent(); // filter for VoucherCreated events
  const events = await contract.queryFilter(eventFilter); 
  return events;
}

async function getPastVoucherReclaimedEvents(contract) {
  const eventFilter = contract.filters.VoucherReclaimed(); // filter for VoucherCreated events
  const events = await contract.queryFilter(eventFilter); 
  return events;
}


async function main() {
  const contractAddress = '';
  console.log("Reading events of deployed contract: ", contractAddress);
  // connect to the deployed contract
  const voucherStore = await hre.ethers.getContractAt("VoucherStore", contractAddress);
  // get the past created events
  const events = await getPastVoucherCreatedEvents(voucherStore);

  // print the events
  console.log("VoucherCreated events:");
  events.forEach((event) => {
    console.log(event.args.code, event.args.amount.toString());
    }
  );

  // get the past sent events
  const sentEvents = await getPastVoucherSentEvents(voucherStore);

  // print the events
  console.log("VoucherSent events:");
  sentEvents.forEach((event) => {
    console.log(event.args.code, event.args.amount.toString());
    }
  );

  // get the past reclaimed events
  const reclaimedEvents = await getPastVoucherReclaimedEvents(voucherStore);

  // print the events
  console.log("VoucherReclaimed events:");
  reclaimedEvents.forEach((event) => {
    console.log(event.args.code, event.args.amount.toString());
    }
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
