const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voucher", function() {
  let Voucher, voucher, owner, pledger1, pledger2, user1, user2, relayer, addr1, addr2;
  
  beforeEach(async () => {
    Voucher = await ethers.getContractFactory("Voucher");
    [owner, pledger1, pledger2, user1, user2, relayer, addr1, addr2, _] = await ethers.getSigners();
    
    // Deploy the contract
    voucher = await Voucher.deploy(relayer.address);
    await voucher.deployed();
  });

  it("Should set the correct relayer", async function() {
    expect(await voucher.relayer()).to.equal(relayer.address);
  });

  it("Should allow pledgers to deposit and allocate vouchers", async function() {
    // Pledger1 deposits
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("2") });
    expect(await voucher.balances(pledger1.address)).to.equal(ethers.utils.parseEther("2"));

    // Pledger1 allocates vouchers
    await voucher.connect(pledger1).addVouchers(["code1", "code2"], [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")]);
    expect(await voucher.vouchers("code1")).to.equal(ethers.utils.parseEther("1"));
    expect(await voucher.vouchers("code2")).to.equal(ethers.utils.parseEther("1"));
  });

  it("Should allow pledgers to approve claimants", async function() {
    // Pledger1 deposits
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("2") });

    // Pledger1 allocates vouchers
    await voucher.connect(pledger1).addVouchers(["code1", "code2"], [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")]);

    // Pledger1 approves claimants
    await voucher.connect(pledger1).approveClaimants(["code1", "code2"], [user1.address, user2.address]);
    expect(await voucher.approvedClaimants("code1")).to.equal(user1.address);
    expect(await voucher.approvedClaimants("code2")).to.equal(user2.address);
  });

  it("Should allow relayer to send vouchers", async function() {
    // Pledger1 deposits
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("2") });

    // Pledger1 allocates vouchers
    await voucher.connect(pledger1).addVouchers(["code1", "code2"], [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")]);

    // Pledger1 approves claimants
    await voucher.connect(pledger1).approveClaimants(["code1", "code2"], [user1.address, user2.address]);

    // Relayer sends vouchers
    await voucher.connect(relayer).sendVouchers(["code1", "code2"], [user1.address, user2.address]);

    expect(await ethers.provider.getBalance(user1.address)).to.equal(ethers.utils.parseEther("1"));
        // Continued from last test
        expect(await ethers.provider.getBalance(user2.address)).to.equal(ethers.utils.parseEther("1"));
        expect(await voucher.vouchers("code1")).to.equal(0);
        expect(await voucher.vouchers("code2")).to.equal(0);
      });
    
  it("Should revoke the PLEDGER_ROLE when all their vouchers have been claimed", async function() {
    // Pledger1 deposits
    await voucher.connect(pledger1).deposit({ value: ethers.utils.parseEther("2") });

    // Pledger1 allocates vouchers
    await voucher.connect(pledger1).addVouchers(["code1", "code2"], [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")]);

    // Pledger1 approves claimants
    await voucher.connect(pledger1).approveClaimants(["code1", "code2"], [user1.address, user2.address]);

    // Relayer sends vouchers
    await voucher.connect(relayer).sendVouchers(["code1", "code2"], [user1.address, user2.address]);

    expect(await voucher.hasRole(voucher.PLEDGER_ROLE(), pledger1.address)).to.be.false;
  });
});

