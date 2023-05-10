//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VoucherStore is AccessControl, Ownable {
    bytes32 public constant PLEDGER_ROLE = keccak256("PLEDGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    address public operator;
    
    struct Pledger {
        uint256 balance;
        uint32 nVouchers;
    }
    struct Voucher {
        uint256 amount;
        address pledger;
    }

    mapping(address => Pledger) pledgers;
    mapping(bytes32 => Voucher) vouchers;

    event VoucherCreated(address pledger, bytes32 code, uint256 amount);
    event VoucherSent(bytes32 code, address receiver);
    event VoucherReclaimed(bytes32 code);

    constructor(address _operator) {
        // set owner to msg.sender
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(OPERATOR_ROLE, _operator);
        operator = _operator;
    }


    modifier onlyPledger() {
        require(hasRole(PLEDGER_ROLE, msg.sender), "Caller is not a pledger");
        _;
    }


    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender), "Caller is not a relayer");
        _;
    }


    modifier onlyOperatorOrPledger() { 
        uint256 initialGas = gasleft();
        require(hasRole(OPERATOR_ROLE, msg.sender) || hasRole(PLEDGER_ROLE, msg.sender), "Caller is not a relayer or pledger");
        _;
        (bool sent, ) = payable(msg.sender).call{value:(initialGas - gasleft()) * tx.gasprice}("");
        require(sent, "Gas fee reimbursement failed");
    }


    receive() external payable {
        deposit();
    }


    function deposit() public payable {
        require(msg.value > 1 ether, "Value sent must be greater than 0.2 ether");
        if (!hasRole(PLEDGER_ROLE, msg.sender)) {
            _grantRole(PLEDGER_ROLE, msg.sender);
        }
        pledgers[msg.sender].balance = pledgers[msg.sender].balance + msg.value; 
    }


    function withdrawVouchers() public onlyPledger {
        uint256 balance = pledgers[msg.sender].balance;
        require(balance > 0, "Balance must be greater than 0");
        pledgers[msg.sender].balance = 0;
        (bool sent, ) = payable(msg.sender).call{value:balance}("");
        require(sent, "Voucher transfer failed");
    }


    // given an array of voucher codes, deplete the voucher amounts and add them to the pledger's balance
    // if the voucher amount is zero, skip it and check if the voucher codes belong to the sender
    function reclaimVouchers(bytes32[] calldata _codes) public onlyPledger {
        // check if the vouchers belong to the sender
        require(checkVoucherPledger(_codes, msg.sender), "Vouchers do not belong to sender");
        // store gas amount
        uint256 initialGas = gasleft();
        uint256 balance = pledgers[msg.sender].balance;
        for (uint256 i = 0; i < _codes.length; ++i) {
            if (vouchers[_codes[i]].amount > 0) {
                balance += vouchers[_codes[i]].amount;
                vouchers[_codes[i]].amount = 0;
                emit VoucherReclaimed(_codes[i]);
                pledgers[msg.sender].nVouchers -= 1;
            }
        }
        // substract gas used from balance
        balance -= (initialGas - gasleft()) * tx.gasprice; 
        pledgers[msg.sender].balance = balance;
    }

    function setOperator(address newOperator) public onlyOwner {
        require(newOperator != address(0), "New operator cannot be the zero address");
        revokeRole(OPERATOR_ROLE, operator);
        grantRole(OPERATOR_ROLE, newOperator);
        operator = newOperator;
    }


    function computeArraySum(uint256[] memory _amounts) internal pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < _amounts.length; ++i) {
            sum += _amounts[i];
        } 
        return sum;
    }


    function addVouchers(uint256[] calldata _amounts) public onlyPledger {
        Pledger storage pledger = pledgers[msg.sender];
        uint256 balance = pledger.balance;
        // 975/1000 is used to keep a 2.5% buffer in the pledger's balance so that the contract can reimburse gas fees and still have enough balance to pay out vouchers
        require(computeArraySum(_amounts) <= balance * 975/1000, "Not enough balance to add vouchers");
        for(uint256 i = 0; i < _amounts.length; ++i) {
            bytes32 codeHash = keccak256(abi.encodePacked(_amounts[i], msg.sender, block.timestamp, i));
            bytes32 voucherCode = bytes32(codeHash << 224); // take right most 64 bits (8bytes) of hash
            vouchers[voucherCode] = Voucher(_amounts[i], msg.sender);
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


    function checkVoucherPledger(bytes32[] calldata _codes, address pledger) public view returns (bool) {
        require(_codes.length > 0, "Codes array must not be empty");
        for (uint256 i = 1; i < _codes.length; ++i) {
            if (vouchers[_codes[i]].pledger != pledger) {
                return false;
            }
        }
        return true;
    }


    function sendVouchers(address[] calldata _recipients, bytes32[] calldata _codes) public onlyOperatorOrPledger {
        require(_recipients.length == _codes.length, "Recipients and codes array lengths must be equal");
        uint256[] memory amounts = new uint256[](_recipients.length);
        uint256 initialGas = gasleft();
        uint256 gasAmount = 21000;
        uint256 nonZeroVoucherCount = 0;
        uint256 zeroBalanceCount = 0;

        // check if the vouchers belong to the sender
        if(msg.sender != operator) {
            require(checkVoucherPledger(_codes, msg.sender), "Vouchers do not belong to sender");
        }
        
        // iterate over voucher codes and collect the amounts
        // if the voucher amount is non-zero, set the amount to the voucher amount and set the voucher amount to zero
        // and increment the nonZeroVoucherCount if the voucher amount is non-zero
        // decrement the pledger's voucher count
        // if the voucher amount is zero, set the amount to zero
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
        require(gasAmount * tx.gasprice < address(this).balance - computeArraySum(amounts), "Not enough balance to reimburse for gas fees");

        for (uint256 i = 0; i < _recipients.length; i++) {
            if (amounts[i] > 0) {
                (bool sent, ) = payable(_recipients[i]).call{value:amounts[i]}("");
                require(sent, "Voucher transfer failed");
                emit VoucherSent(_codes[i], _recipients[i]);
            }
        }
    }  
}
