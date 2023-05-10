const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('VoucherStore', function() {
  let VoucherStore, voucherStore, owner, operator, addr1, addr2, addr3;

  beforeEach(async function() {
    VoucherStore = await ethers.getContractFactory('VoucherStore');
    [owner, operator, addr1, addr2, addr3] = await ethers.getSigners();
    voucherStore = await VoucherStore.deploy(operator.address);
    await voucherStore.deployed();
  });

  describe('Deployment', function() {
    it('Should set the correct owner', async function() {
      console.log('owner.address', owner.address);
      console.log(await voucherStore.owner());
      expect(await voucherStore.owner()).to.equal(owner.address);
    });

    it('Should set the correct operator', async function() {
      expect(await voucherStore.operator()).to.equal(operator.address);
    });
  });

  describe('Roles', function() {
    it('Should grant the PLEDGER_ROLE after deposit', async function() {
      await voucherStore.connect(owner).setOperator(addr2.address);
      await addr2.sendTransaction({ to: voucherStore.address, value: ethers.utils.parseEther('2') });
      expect(await voucherStore.hasRole(await voucherStore.PLEDGER_ROLE(), addr2.address)).to.be.true;
    });

    it('Should allow owner to change operator', async function() {
      await voucherStore.connect(owner).setOperator(addr2.address);
      expect(await voucherStore.operator()).to.equal(addr2.address);
    });

    it('Should not allow non-owner to change operator', async function() {
      await expect(voucherStore.connect(addr1).setOperator(addr2.address)).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('Vouchers', function() {
    it('Should allow pledger to add vouchers', async function() {
      // TODO: tests for addVouchers
    });

    it('Should allow operator to send vouchers', async function() {
      // TODO: tests for sendVouchers
    });

    it('Should allow pledger to reclaim vouchers', async function() {
      // TODO: tests for reclaimVouchers
    });
  });
});
