//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Voucher is AccessControl, Ownable {
    bytes32 public constant PLEDGER_ROLE = keccak256("PLEDGER_ROLE");
    bytes32 public constant PAYMASTER_ROLE = keccak256("PAYMASTER_ROLE");

    mapping(bytes32 => uint256) public vouchers;
    mapping(bytes32 => address) public approvedClaimants;
    mapping(address => uint256) public balances;
    address public paymaster;

    constructor() {
        // set owner to msg.sender
        _setupRole(PLEDGER_ROLE, msg.sender);
        _setupRole(PAYMASTER_ROLE, msg.sender);
    }

    modifier onlyPledger() {
        require(hasRole(PLEDGER_ROLE, msg.sender), "Caller is not a pledger");
        _;
    }

    function deposit() public payable {
        require(msg.value > 0.1 ether, "Value sent must be greater than 0.1 ether");

        if (!hasRole(PLEDGER_ROLE, msg.sender)) {
            grantRole(PLEDGER_ROLE, msg.sender);
        }

        balances[msg.sender] += msg.value;
    }

    function setPaymaster(address newPaymaster) public onlyOwner {
        require(newPaymaster != address(0), "New paymaster cannot be the zero address");
        paymaster = newPaymaster;
    }

    function checkArraySum(uint256[] calldata _amounts) internal pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < _amounts.length; ++i) {
            sum += _amounts[i];
        }
        return sum;
    }

    function addVouchers(bytes32[] memory _codes, uint256[] calldata _amounts) public onlyPledger {
        require(_codes.length == _amounts.length, "Codes and amounts must be the same length");
        require(checkArraySum(_amounts) <= balances[msg.sender], "Not enough balance to add vouchers");
        for (uint256 i = 0; i < _codes.length; ++i) {
            vouchers[_codes[i]] = _amounts[i];
            balances[msg.sender] -= _amounts[i];
        }
    }

    function approveClaimant(bytes32 _code, address _claimant) public onlyPledger {
        require(vouchers[_code] > 0, "Voucher code does not exist");
        approvedClaimants[_code] = _claimant;
    }

    function claimVoucher(bytes32 _code, address claimant) public {
        require(claimant != address(0), "Claimant cannot be the zero address");
        // reference the storage value directly
        uint256 value = vouchers[_code];
        require(value > 0, "Voucher code does not exist");
        require(approvedClaimants[_code] == claimant, "Sender is not approved to claim this voucher");

        // Reimbursing the paymaster
        if (paymaster == msg.sender) {
            uint256 initialGas = gasleft();
            uint256 relayerFee = tx.gasprice * (21000 + initialGas - gasleft());
            require(value > relayerFee, "Voucher value must be greater than relayer fee");
            value = value - relayerFee;
            (bool sent, ) = payable(paymaster).call{value:relayerFee}("");
            require(sent, "Paymaster transfer failed");
        }
        vouchers[_code] = 0;
        (bool sent, ) = payable(claimant).call{value:value}("");
        require(sent, "Claimant transfer failed");
        approvedClaimants[_code] = address(0);
    }
}