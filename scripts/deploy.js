const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const relayer = deployer.address; // set the relayer address as needed

  const VoucherStore = await hre.ethers.getContractFactory("VoucherStore");
  const voucherStore = await VoucherStore.deploy(relayer);

  await voucherStore.deployed();

  console.log("VoucherStore deployed to:", voucherStore.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
