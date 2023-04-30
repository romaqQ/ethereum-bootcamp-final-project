const hre = require("hardhat");

async function main() {
  const [deployer, relayer] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    deployer.address
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Voucher = await hre.ethers.getContractFactory("Voucher");
  const voucher = await Voucher.deploy(relayer.address);

  await voucher.deployed();

  console.log("Voucher contract deployed to:", voucher.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
