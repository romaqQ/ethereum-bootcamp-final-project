const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VoucherStore", function () {
  let VoucherStore, voucherStore, owner, addr1, addr2, addr3;
  const initialFee = 250; // 2.5% in bps

  beforeEach(async () => {
    VoucherStore = await ethers.getContractFactory("VoucherStore");
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    voucherStore = await VoucherStore.deploy(addr1.address);
    await voucherStore.deployed();
  });

  it("Should set the right owner and relayer", async function () {
    expect(await voucherStore.owner()).to.equal(owner.address);
    expect(await voucherStore.hasRole(await voucherStore.RELAYER_ROLE(), addr1.address)).to.equal(true);
  });

  it("Should let the owner change the relayer", async function () {
    await voucherStore.setRelayer(addr2.address);
    expect(await voucherStore.hasRole(await voucherStore.RELAYER_ROLE(), addr2.address)).to.equal(true);
  });

  it("Should let the owner change the fee", async function () {
    await voucherStore.setFee(300);
    expect(await voucherStore.fee()).to.equal(300);
  });

  it("Should allow deposits, create vouchers, and emit events", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const voucherAmounts = [ethers.utils.parseEther("0.25"), ethers.utils.parseEther("0.25")];

    await voucherStore.connect(addr2).deposit({ value: depositAmount });

    const tx = await voucherStore.connect(addr2).addVouchers(voucherAmounts);
    const receipt = await tx.wait();

    const voucherCodes = receipt.events
      .filter((event) => event.event === "VoucherCreated")
      .map((event) => event.args.code);

    expect(voucherCodes.length).to.equal(voucherAmounts.length);
  });

  it("Should approve claimants and let them claim vouchers", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const voucherAmounts = [ethers.utils.parseEther("0.25"), ethers.utils.parseEther("0.25")];

    await voucherStore.connect(addr2).deposit({ value: depositAmount });

    const tx = await voucherStore.connect(addr2).addVouchers(voucherAmounts);
    const receipt = await tx.wait();

    const voucherCodes = receipt.events
      .filter((event) => event.event === "VoucherCreated")
      .map((event) => event.args.code);

    const claimants = [addr3.address, addr3.address];

    await voucherStore.connect(addr1).approveClaimants(voucherCodes, claimants);

    for (let i = 0; i < voucherCodes.length; ++i) {
      await voucherStore.connect(addr3).claimVoucher(voucherCodes[i]);
    }
  });

  it("Should allow the relayer to send vouchers", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const voucherAmounts = [ethers.utils.parseEther("0.25"), ethers.utils.parseEther("0.25")];

    await voucherStore.connect(addr2).deposit({ value: depositAmount });

    const tx = await voucherStore.connect(addr2).addVouchers(voucherAmounts);
    const receipt = await tx.wait();

    const voucherCodes = receipt.events
      .filter((event) => event.event === "VoucherCreated")
      .map((event) => event.args.code);

    const recipients = [addr3.address, addr3.address];

    await voucherStore.connect(addr1).sendVouchers(recipients, voucherCodes);
  });


  it("Should approve claimants and let them claim vouchers", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const voucherAmounts = [ethers.utils.parseEther("0.25"), ethers.utils.parseEther("0.25")];

    await voucherStore.connect(addr2).deposit    ({ value: depositAmount });
    await voucherStore.connect(addr2).addVouchers(voucherAmounts);

    const voucherCodes = []; // you would have these from the VoucherCreated events
    const claimants = [addr3.address, addr3.address];

    await voucherStore.connect(addr1).approveClaimants(voucherCodes, claimants);

    for (let i = 0; i < voucherCodes.length; ++i) {
      await voucherStore.connect(addr3).claimVoucher(voucherCodes[i]);
    }
  });

  it("Should allow the relayer to send vouchers", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const voucherAmounts = [ethers.utils.parseEther("0.25"), ethers.utils.parseEther("0.25")];

    await voucherStore.connect(addr2).deposit({ value: depositAmount });
    await voucherStore.connect(addr2).addVouchers(voucherAmounts);

    const voucherCodes = []; // you would have these from the VoucherCreated events
    const recipients = [addr3.address, addr3.address];

    await voucherStore.connect(addr1).sendVouchers(recipients, voucherCodes);
  });
});

