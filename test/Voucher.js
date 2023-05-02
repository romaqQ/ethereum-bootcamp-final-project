const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;

describe("Voucher", function () {
  let voucher, owner, pledger1, pledger2, relayer, addr1, addr2, addr3, addr4, addr5;

  beforeEach(async function () {
    [owner, pledger1, pledger2, relayer, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();

    const Voucher = await ethers.getContractFactory("Voucher");
    voucher = await Voucher.deploy(relayer.address);
    await voucher.deployed();
  });

  it("Should set the right owner", async function () {
    expect(await voucher.owner()).to.equal(owner.address);
  });

  it("Should set the right relayer", async function () {
    expect(await voucher.hasRole(await voucher.RELAYER_ROLE(), relayer.address)).to.be.true;
  });

  it("Should allow owner to change the relayer", async function () {
    await voucher.connect(owner).setRelayer(addr1.address);
    expect(await voucher.hasRole(await voucher.RELAYER_ROLE(), addr1.address)).to.be.true;
    expect(await voucher.hasRole(await voucher.RELAYER_ROLE(), relayer.address)).to.be.false;
  });

  it("Should allow pledgers to deposit", async function () {
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("1") });
    expect(await voucher.viewBalance(pledger1.address)).to.equal(ethers.utils.parseEther("0.975")); // 1 ether - 2.5% fee
  });

  it("Should allow pledgers to add vouchers", async function () {
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("1") });
    let voucherCodesPledger1 = await voucher.connect(pledger1).addVouchers([ethers.utils.parseEther("0.1"), ethers.utils.parseEther("0.1")]);
    expect(voucherCodesPledger1.length).to.equal(2);
  });

  it("Should allow pledgers to view their balance", async function () {
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("1") });
    expect(await voucher.connect(pledger1).viewBalance(pledger1.address)).to.equal(ethers.utils.parseEther("0.975"));
  });

  it("Should reimburse relayer for gas fees", async function () {
    let initialBalance = await relayer.getBalance();
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("1") });
    let finalBalance = await relayer.getBalance();
    expect(finalBalance).to.be.above(initialBalance);
  });

  it("Should allow relayer to approve claimants", async function () {
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("1") });
    let voucherCodesPledger1 = await voucher.connect(pledger1).addVouchers([ethers.utils.parseEther("0.1"), ethers.utils.parseEther("0.1")]);
    await voucher.connect(relayer).approveClaimants(voucherCodesPledger1, [addr1.address, addr2.address]);
  });

  it("Should allow claimants to claim their vouchers", async function () {
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("1") });
    let voucherCodesPledger1 = await voucher.connect(pledger1).addVouchers([ethers.utils.parseEther("0.1"), ethers.utils.parseEther("0.1")]);
    await voucher.connect(relayer).approveClaimants(voucherCodesPledger1, [addr1.address, addr2.address]);
    await voucher.connect(addr1).claimVoucher(voucherCodesPledger1[0]);
    expect(await ethers.provider.getBalance(addr1.address)).to.be.above(0);
  });

  it("Should allow relayer to send vouchers", async function () {
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("1") });
    let voucherCodesPledger1 = await voucher.connect(pledger1).addVouchers([ethers.utils.parseEther("0.1"), ethers.utils.parseEther("0.1")]);
    await voucher.connect(relayer).approveClaimants(voucherCodesPledger1, [addr1.address, addr2.address]);
    let initialBalances = [await ethers.provider.getBalance(addr1.address), await ethers.provider.getBalance(addr2.address)];
    await voucher.connect(relayer).sendVouchers([addr1.address, addr2.address], voucherCodesPledger1);
    let finalBalances = [await ethers.provider.getBalance(addr1.address), await ethers.provider.getBalance(addr2.address)];
    expect(finalBalances[0]).to.be.above(initialBalances[0]);
    expect(finalBalances[1]).to.be.above(initialBalances[1]);
  });

  it("Should allow owner to change the fee", async function () {
    await voucher.connect(owner).setFee(500); // 5%
    expect(await voucher.fee()).to.equal(500);
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("1") });
    expect(await voucher.viewBalance(pledger1.address)).to.equal(ethers.utils.parseEther("0.95"));
  });

});
