pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Voucher is AccessControl, Ownable {
    bytes32 public constant PLEDGER_ROLE = keccak256("PLEDGER_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    mapping(bytes32 => uint256) public vouchers;
    mapping(bytes32 => address) public approvedClaimants;
    mapping(address => uint256) public balances;
    mapping(address => uint256) public activeVoucherCount;

    address public relayer;

    event VoucherCreated(bytes32 code, uint256 amount);
    event VoucherClaimed(bytes32 code, address claimant, uint256 amount);

    constructor(address _relayer) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(RELAYER_ROLE, _relayer);
        relayer = _relayer;
    }

    modifier onlyPledger() {
        require(hasRole(PLEDGER_ROLE, msg.sender), "Caller is not a pledger");
        _;
    }

    modifier onlyRelayer() {
        require(hasRole(RELAYER_ROLE, msg.sender), "Caller is not a relayer");
        _;
    }

    function deposit() public payable {
        require(msg.value > 0.1 ether, "Value sent must be greater than 0.1 ether");
        if (!hasRole(PLEDGER_ROLE, msg.sender)) {
            grantRole(PLEDGER_ROLE, msg.sender);
        }
        balances[msg.sender] += msg.value;
    }

    function setRelayer(address newRelayer) public onlyOwner {
        require(newRelayer != address(0), "New relayer cannot be the zero address");
        revokeRole(RELAYER_ROLE, relayer);
        grantRole(RELAYER_ROLE, newRelayer);
        relayer = newRelayer;
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
        
        // Increment the active voucher count for the pledger
        activeVoucherCount[msg.sender]++;
        }
    }  

    function approveClaimants(bytes32[] memory _codes, address[] memory _claimants) public onlyPledger {
        require(_codes.length == _claimants.length, "Codes and claimants must be the same length");
        for (uint256 i = 0; i < _codes.length; ++i) {
            require(vouchers[_codes[i]] > 0, "Voucher code does not exist");
            approvedClaimants[_codes[i]] = _claimants[i];
        }
    }

    function sendVouchers(address[] calldata _recipients, bytes32[] calldata _codes) public {
        require(hasRole(PLEDGER_ROLE, msg.sender) || msg.sender == relayer, "Caller is not a pledger or relayer");
        require(_recipients.length == _codes.length, "Recipients and codes array lengths must be equal");

        uint256 initialGas = gasleft();
        uint256 relayerFee = 0;
        for (uint i = 0; i < _recipients.length; i++) {
            require(vouchers[_codes[i]] > 0, "Voucher does not exist");
            require(approvedClaimants[_codes[i]] == _recipients[i], "Recipient not approved for voucher");

            uint256 value = vouchers[_codes[i]];

            if (msg.sender == relayer) {
                relayerFee = tx.gasprice * (21000 + initialGas - gasleft()) / _recipients.length;
                require(value > relayerFee, "Voucher value must be greater than relayer fee");
                value -= relayerFee;
            }

            vouchers[_codes[i]] = 0;
            (bool sent, ) = payable(_recipients[i]).call{value:value}("");
            require(sent, "Voucher transfer failed");
            approvedClaimants[_codes[i]] = address(0);

            emit VoucherClaimed(_codes[i], _recipients[i], value);

            // Decrement the active voucher count for the pledger
            activeVoucherCount[msg.sender]--;
        }

        if (msg.sender == relayer) {
            (bool sent, ) = payable(relayer).call{value:relayerFee}("");
            require(sent, "Relayer fee transfer failed");
        }

        // Check if all vouchers for the pledger have been claimed
        if (activeVoucherCount[msg.sender] == 0) {
            revokeRole(PLEDGER_ROLE, msg.sender);
        }
    }  

}
