const { expect } = require("chai");

describe("Voucher", function () {
  let Voucher, voucher, accounts;

  beforeEach(async function () {
    Voucher = await ethers.getContractFactory("Voucher");
    [deployer, relayer, pledger1, pledger2, user1, user2, user3] = await ethers.getSigners();
    voucher = await Voucher.deploy(relayer.address);
    await voucher.deployed();
  });

  it("Should allow pledgers to deposit and allocate vouchers", async function () {
    // pledger1 deposits
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("5") });
    expect(await voucher.balances(pledger1.address)).to.equal(ethers.utils.parseEther("5"));

    // pledger1 adds vouchers
    const tx = await voucher.connect(pledger1).addVouchers([ethers.utils.parseEther("1"), ethers.utils.parseEther("1")]);
    const receipt = await tx.wait();
    const event = receipt.events?.filter((x) => {return x.event == "VouchersAdded";})[0];
    const voucherCodesPledger1 = event.args.voucherCodes;
    console.log(voucherCodesPledger1);
    // Check that vouchers were created and balances were deducted
    for (let code of voucherCodesPledger1) {
      expect(await voucher.vouchers(code)).to.equal(ethers.utils.parseEther("1"));
    }
    expect(await voucher.balances(pledger1.address)).to.equal(0);

    // pledger2 deposits and adds vouchers
    await voucher.connect(pledger2).deposit({ value: ethers.utils.parseEther("2") });
    const voucherCodesPledger2 = await voucher.connect(pledger2).addVouchers([
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ]);

    // Check that vouchers were created and balances were deducted
    for (let code of voucherCodesPledger2) {
      expect(await voucher.vouchers(code)).to.equal(ethers.utils.parseEther("1"));
    }
    expect(await voucher.balances(pledger2.address)).to.equal(0);
  });

  it("Should allow relayer to send vouchers", async function () {
    // Deposit and add vouchers
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("2") });
    const voucherCodesPledger1 = await voucher.connect(pledger1).addVouchers([
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ]);
    console.log(voucherCodesPledger1);
    // Approve users as claimants
    await voucher.connect(pledger1).approveClaimants([user1.address, user2.address], voucherCodesPledger1);

    // Relayer sends vouchers
    await voucher.connect(relayer).sendVouchers([user1.address, user2.address], voucherCodesPledger1);

    // Check that vouchers have been claimed and claimants received the funds
    for (let code of voucherCodesPledger1) {
      expect(await voucher.vouchers(code)).to.equal(0);
    }
    expect(await ethers.provider.getBalance(user1.address)).to.equal(ethers.utils.parseEther("1"));
    expect(await ethers.provider.getBalance(user2.address)).to.equal(ethers.utils.parseEther("1"));
  });

  it("Should reimburse relayer for gas fees", async function () {
    // Deposit and add vouchers
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("2") });
    const voucherCodesPledger1 = await voucher.connect(pledger1).addVouchers([
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
    ]);

    // Approve users as claimants
    await voucher.connect(pledger1).approveClaimants([user1.address, user2.address], voucherCodesPledger1);

    // Save relayer balance before sending vouchers
    const initialRelayerBalance = await ethers.provider.getBalance(relayer.address);

    // Relayer sends vouchers
    const tx = await voucher.connect(relayer).sendVouchers([user1.address, user2.address], voucherCodesPledger1);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed;

    // Check that relayer was reimbursed for gas fees
    const finalRelayerBalance = await ethers.provider.getBalance(relayer.address);
    expect(finalRelayerBalance).to.be.above(initialRelayerBalance);
});

it("Should not allow non-relayers to get reimbursed for gas fees", async function () {
    // Deposit and add vouchers
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("2") });
    const voucherCodesPledger1 = await voucher.connect(pledger1).addVouchers([
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
    ]);

    // Approve users as claimants
    await voucher.connect(pledger1).approveClaimants([user1.address, user2.address], voucherCodesPledger1);

    // Save pledger1 balance before sending vouchers
    const initialPledger1Balance = await ethers.provider.getBalance(pledger1.address);

    // Pledger1 sends vouchers
    const tx = await voucher.connect(pledger1).sendVouchers([user1.address, user2.address], voucherCodesPledger1);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed;

    // Check that pledger1 was not reimbursed for gas fees
    const finalPledger1Balance = await ethers.provider.getBalance(pledger1.address);
    expect(finalPledger1Balance).to.be.below(initialPledger1Balance);
});

});
