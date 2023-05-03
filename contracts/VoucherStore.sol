pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VoucherStore is AccessControl, Ownable {
    bytes32 public constant PLEDGER_ROLE = keccak256("PLEDGER_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    address public relayer;
    uint32 public fee = 250; // 2.5% fee in bps
    
    struct Pledger {
        uint256 balance;
        uint32 nVouchers;
    }
    struct Voucher {
        uint256 amount;
        address claimant;
        address pledger;
    }

    mapping(address => Pledger) pledgers;
    mapping(bytes32 => Voucher) vouchers;

    event VoucherCreated(address pledger, bytes32 code, uint256 amount);
    event VoucherClaimed(bytes32 code, address claimant);

    constructor(address _relayer) {
        // set owner to msg.sender
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


    modifier onlyRelayerOrPledger() { 
        uint256 initialGas = gasleft();
        require(hasRole(RELAYER_ROLE, msg.sender) || hasRole(PLEDGER_ROLE, msg.sender), "Caller is not a relayer or pledger");
        _;
        (bool sent, ) = payable(msg.sender).call{value:(initialGas - gasleft()) * tx.gasprice}("");
        require(sent, "Gas fee reimbursement failed");
    }


    function deposit() public payable {
        require(msg.value > 0.2 ether, "Value sent must be greater than 0.2 ether");
        if (!hasRole(PLEDGER_ROLE, msg.sender)) {
            _grantRole(PLEDGER_ROLE, msg.sender);
        }
        // adjust balance for fee (which is used for gas reimbursement and also incentive for relayer / voucher service)
        uint256 feeAmount = msg.value * uint256(fee) / 10_000;
        // check if the pledger has been added to the pledgers mapping
        if (pledgers[msg.sender].balance == 0) {
            pledgers[msg.sender].balance = msg.value - feeAmount;
        } else {
            pledgers[msg.sender].balance = pledgers[msg.sender].balance + msg.value - feeAmount;
        }
    }


    function setFee(uint32 _fee) public onlyOwner {
        fee = _fee;
    }


    function setRelayer(address newRelayer) public onlyOwner {
        require(newRelayer != address(0), "New relayer cannot be the zero address");
        revokeRole(RELAYER_ROLE, relayer);
        grantRole(RELAYER_ROLE, newRelayer);
        relayer = newRelayer;
    }


    function checkArraySum(uint256[] memory _amounts) internal pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < _amounts.length; ++i) {
            sum += _amounts[i];
        }
        return sum;
    }


    function addVouchers(uint256[] calldata _amounts) public onlyPledger {
        Pledger storage pledger = pledgers[msg.sender];
        uint256 balance = pledger.balance;
        require(checkArraySum(_amounts) <= pledger.balance, "Not enough balance to add vouchers");
        for(uint256 i = 0; i < _amounts.length; ++i) {
            bytes32 codeHash = keccak256(abi.encodePacked(_amounts[i], msg.sender, block.timestamp, i));
            bytes32 voucherCode = bytes32(codeHash << 224); // take right most 64 bits (8bytes) of hash
            vouchers[voucherCode] = Voucher(_amounts[i], address(0), msg.sender);
            balance -= _amounts[i];
            emit VoucherCreated(msg.sender, voucherCode, _amounts[i]);
        }
        pledgers[msg.sender].balance = balance;
        pledgers[msg.sender].nVouchers += uint32(_amounts.length);
    }


    function viewPledger(address _address) public view returns (Pledger memory) {
        return pledgers[_address];
    }


    function viewVoucher(bytes32 _code) public view returns (Voucher memory) {
        return vouchers[_code];
    }


    function approveClaimants(bytes32[] memory _codes, address[] memory _claimants) public onlyRelayerOrPledger {
        require(_codes.length == _claimants.length, "Codes and claimants must be the same length");
        for (uint256 i = 0; i < _codes.length; ++i) {
            require(vouchers[_codes[i]].amount > 0, "Voucher code does not exist");
            vouchers[_codes[i]].claimant = _claimants[i];
        }
    }

    // ToDo: add a check to make sure the claimant is not a contract
    function claimVoucher(bytes32 code) public {
        require(vouchers[code].amount > 0, "Voucher code does not exist");
        require(vouchers[code].claimant == msg.sender, "Claimant is not approved");
        Voucher storage voucher = vouchers[code];
        (bool sent, ) = payable(msg.sender).call{value:voucher.amount}("");
        require(sent, "Voucher claim failed");
        voucher.amount = 0;
        pledgers[voucher.pledger].nVouchers -= 1;
        emit VoucherClaimed(code, msg.sender);
    }

    
    function sendVouchers(address[] calldata _recipients, bytes32[] calldata _codes) public onlyRelayerOrPledger {
        require(_recipients.length == _codes.length, "Recipients and codes array lengths must be equal");
        uint256[] memory amounts = new uint256[](_recipients.length);
        uint256 initialGas = gasleft();
        uint256 gasAmount = 21000;
        uint256 nonZeroVoucherCount = 0;
        uint256 zeroBalanceCount = 0;
        for (uint256 i = 0; i < _recipients.length; i++) {
            Voucher storage voucher = vouchers[_codes[i]];
            if (voucher.amount > 0) {
                amounts[i] = voucher.amount;
                voucher.amount = 0;
                pledgers[voucher.pledger].nVouchers -= 1;

                ++nonZeroVoucherCount;
                if(address(_recipients[i]).balance == 0) {
                    ++zeroBalanceCount;
                }
            } else {
                amounts[i] = 0;
            }
        }

        require(nonZeroVoucherCount > 0, "Vouchers do not exist");
        // account for how many EOA with zero balance will receive the vouchers
        // if the EOA has zero balance, it will cost 25700 (25000 transfer + 700 CALL OP) gas to send the voucher
        // if the EOA has non-zero balance, it will cost 9700 gas to send the voucher
        // also account for the reimbursement transaction
        gasAmount = gasAmount + (9700 * (nonZeroVoucherCount + 1 - zeroBalanceCount)  + 25700 * zeroBalanceCount) + initialGas - gasleft();
        
        // require that the gas fee is less than the balance of the contract minus the voucher values to be paid out
        require(gasAmount * tx.gasprice < address(this).balance - checkArraySum(amounts), "Not enough balance to reimburse for gas fees");

        for (uint256 i = 0; i < _recipients.length; i++) {
            if (amounts[i] > 0) {
                (bool sent, ) = payable(_recipients[i]).call{value:amounts[i]}("");
                require(sent, "Voucher transfer failed");
                emit VoucherClaimed(_codes[i], _recipients[i]);
            }
        }
    }  
}
