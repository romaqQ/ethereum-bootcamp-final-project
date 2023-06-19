import { useWeb3React } from "@web3-react/core";
import { BigNumber, Contract, ethers, Signer } from "ethers";
import { useLocation } from "react-router-dom";
import copy from "clipboard-copy";

import {
  ChangeEvent,
  MouseEvent,
  ReactElement,
  useEffect,
  useState,
} from "react";
import styled from "styled-components";
import VoucherStoreArtifact from "../artifacts/contracts/VoucherStore.sol/VoucherStore.json";
import { Provider } from "../utils/provider";
import { SectionDivider } from "./SectionDivider";

export const StyledDeployContractButton = styled.button`
  width: 180px;
  height: 2rem;
  border-radius: 1rem;
  border-color: blue;
  cursor: pointer;
  place-self: center;
`;

export const StyledGreetingDiv = styled.div`
  display: grid;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-columns: 135px 2.7fr 1fr;
  grid-gap: 10px;
  place-self: center;
  align-items: center;
`;

export const StyledLabel = styled.label`
  font-weight: bold;
`;

export const StyledInput = styled.input`
  padding: 0.4rem 0.6rem;
  line-height: 2fr;
`;

export const StyledButton = styled.button`
  width: 75px;
  height: 2rem;

  border-color: blue;
  cursor: pointer;
`;

interface InputField {
  value: number;
}

type TVoucher = {
  code: string;
  amount: string;
  recipient?: string;
  send?: boolean;
  id: string;
};

interface TableProps {
  data: {
    code: string;
    amount: string;
    recipient?: string;
    send?: boolean;
    id: string;
  }[];
}

function generateRandomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

const VoucherTable: React.FC<TableProps> = ({ data }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>B-Code</th>
          <th>OC-Code</th>
          <th>Amount</th>
          <th>Recipient</th>
          <th>Sent</th>
          <th>Link</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index}>
            <td>{item.id}</td>
            {/* TODO: truncate */}
            <td>{item.code}</td>
            <td>{item.amount}</td>
            <td>{item.recipient ? item.recipient : "Not claimed"}</td>
            <td>{item.send ? item.send.toString() : "false"}</td>
            <td>
              <button
                onClick={() => {
                  copy(
                    "http://localhost:3000/claim?fcode=" +
                      item.id +
                      "&scode=" +
                      item.code
                  );
                }}
              >
                Copy Link
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export function Voucher(): ReactElement {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initContractAddr = queryParams.get("contract");
  const context = useWeb3React<Provider>();
  const { library, active } = context;
  var url = "http://localhost:8545";
  var provider = new ethers.providers.JsonRpcProvider(url);
  const [signer, setSigner] = useState<Signer>();
  const [voucherStoreContract, setVoucherStoreContract] = useState<Contract>();
  const [voucherStoreContractAddr, setVoucherStoreContractAddr] =
    useState<string>("");
  const [fundedAmount, setFundedAmount] = useState<BigNumber>();

  const [depositAmount, setDepositAmount] = useState<string>("");
  const [operatorInput, setOperatorInput] = useState<string>("");
  const [accountVouchers, setAccountVouchers] = useState<TVoucher[]>([]);

  const [inputFields, setInputFields] = useState<InputField[]>([]);
  const [maxValue, setMaxValue] = useState(100);

  const handleAddFields = () => {
    const newFields = [...inputFields];
    newFields.push({ value: 1 });
    setInputFields(newFields);
  };

  const handleRemoveFields = (index: number) => {
    const newFields = [...inputFields];
    newFields.splice(index, 1);
    setInputFields(newFields);
  };

  const inputSum = () => {
    const sum = inputFields.reduce((total, value) => {
      return isNaN(value.value) ? total : total + value.value;
    }, 0);
    return sum;
  };

  const handleInputChange = (index: number, value: number) => {
    const newFields = [...inputFields];
    newFields[index].value = value;
    setInputFields(newFields);
    const currentVoucherAmount = inputSum();
    const floatDepositAmount = Number(fundedAmount);
    setMaxValue(floatDepositAmount - currentVoucherAmount);
  };

  const renderInputFields = () => {
    return inputFields.map((field, index) => (
      <div key={index} style={{ margin: "0.2rem" }}>
        <StyledInput
          type="number"
          min={0.01}
          step="0.01"
          max={maxValue}
          value={field.value}
          onChange={(e) => handleInputChange(index, e.target.valueAsNumber)}
        />
        <StyledButton onClick={() => handleRemoveFields(index)}>
          Remove
        </StyledButton>
      </div>
    ));
  };

  async function getDeployedVouchers(
    initSigner: Signer,
    initContractAddr: string
  ) {
    let url = "http://localhost:3004/data";
    let signerAddress = await initSigner.getAddress();
    await fetch(url)
      .then(async (response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error("Something went wrong");
      })
      .then((data) => {
        const filteredData = data.filter(
          (a: { pledger: string | undefined; contractAddress: string }) =>
            a.pledger == signerAddress && a.contractAddress == initContractAddr
        );
        setAccountVouchers(filteredData);
      });
  }

  useEffect((): void => {
    if (!library) {
      setSigner(undefined);
      return;
    }
    const initSigner = library.getSigner();
    setSigner(initSigner);
    if (initContractAddr) {
      let contract = new ethers.Contract(
        initContractAddr,
        VoucherStoreArtifact.abi,
        provider
      );
      if (initSigner) {
        let contractWithSigner = contract.connect(initSigner);
        setVoucherStoreContractAddr(initContractAddr);
        setVoucherStoreContract(contractWithSigner);
        getDeployedVouchers(initSigner, initContractAddr);
      }
    }
  }, [library]);

  async function postRequestVoucherCreated(vouchers: TVoucher[]) {
    const sender = signer ? await signer.getAddress() : "";
    for (let i = 0; i < vouchers.length; i++) {
      let url = "http://localhost:3004/data";
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: vouchers[i].id,
          code: vouchers[i].code,
          amount: vouchers[i].amount,
          contractAddress: voucherStoreContractAddr,
          pledger: sender,
        }),
      };
      await fetch(url, requestOptions).then((response) => response.json());
      // .then((data) => setAccountVouchers(data.voucher));
    }
  }

  async function getDepositAmount(): Promise<void> {
    if (!voucherStoreContract) {
      // window.alert("Undefined voucherContract");
      return;
    }
    try {
      const pledger = signer ? await signer.getAddress() : "";
      let tx = await voucherStoreContract.viewPledger(pledger);
      setFundedAmount(tx.balance);
    } catch (error: any) {
      window.alert(
        "Error!" + (error && error.message ? `\n\n${error.message}` : "")
      );
    }

    if (!voucherStoreContract || !signer) {
      return;
    }
  }

  async function withdrawBalance(): Promise<void> {
    if (!voucherStoreContract) {
      // window.alert("Undefined voucherContract");
      return;
    }
    try {
      const pledger = signer ? await signer.getAddress() : "";
      let withdraw_tx = await voucherStoreContract.withdrawBalance(pledger);
      let tx = await voucherStoreContract.viewPledger(pledger);
      setFundedAmount(tx.balance);
    } catch (error: any) {
      window.alert(
        "Error!" + (error && error.message ? `\n\n${error.message}` : "")
      );
    }

    if (!voucherStoreContract || !signer) {
      return;
    }
  }

  async function depleteVouchers() {
    if (!voucherStoreContract) {
      window.alert("Undefined voucherContract");
      return;
    }
    let validVouchers = accountVouchers.filter(
      (a) => a.recipient && a.send !== true
    );

    if (!validVouchers) {
      window.alert("No valid vouchers found.");
      return;
    }

    try {
      let codes: string[] = validVouchers.map((a) => a.code);

      let tx = await voucherStoreContract.reclaimVouchers(codes);

      for (let i = 0; i < validVouchers.length; i++) {
        let url = "http://localhost:3004/data/" + validVouchers[i].id;
        const sender = signer ? await signer.getAddress() : "";
        const requestOptions = {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: validVouchers[i].id,
            code: validVouchers[i].code,
            amount: validVouchers[i].amount,
            contractAddress: voucherStoreContractAddr,
            pledger: sender,
            recipient: validVouchers[i].recipient,
            send: false,
            status: "depleted",
          }),
        };
        await fetch(url, requestOptions).then((response) => response.json());
      }
    } catch (error: any) {
      window.alert(
        "Error!" + (error && error.message ? `\n\n${error.message}` : "")
      );
    }
  }

  useEffect((): void => {
    if (!voucherStoreContract) {
      return;
    }

    getDepositAmount();
  }, [voucherStoreContract, depositAmount, voucherStoreContractAddr]);

  function handleDeployContract(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    // only deploy the Greeter contract one time, when a signer is defined
    if (voucherStoreContract || !signer) {
      return;
    }

    async function deployVoucherStoreContract(signer: Signer): Promise<void> {
      const VoucherStore = new ethers.ContractFactory(
        VoucherStoreArtifact.abi,
        VoucherStoreArtifact.bytecode,
        signer
      );

      try {
        const voucherStoreContract = await VoucherStore.deploy(
          signer.getAddress()
        );

        await voucherStoreContract.deployed();

        setVoucherStoreContract(voucherStoreContract);

        window.alert(
          `Voucher store deployed to: ${voucherStoreContract.address}`
        );

        setVoucherStoreContractAddr(voucherStoreContract.address);
      } catch (error: any) {
        window.alert(
          "Error!" + (error && error.message ? `\n\n${error.message}` : "")
        );
      }
    }

    deployVoucherStoreContract(signer);
  }

  async function handleDeposit() {
    if (!voucherStoreContract) {
      window.alert("Undefined voucherContract");
      return;
    }
    try {
      let tx = await voucherStoreContract.deposit({
        value: ethers.utils.parseEther(depositAmount),
      });
      setFundedAmount(tx.value);
    } catch (error: any) {
      window.alert(
        "Error!" + (error && error.message ? `\n\n${error.message}` : "")
      );
    }
  }
  async function handleSetOperator() {
    if (!voucherStoreContract) {
      window.alert("Undefined voucherContract");
      return;
    }
    try {
      let tx = await voucherStoreContract.setOperator(operatorInput);
      window.alert("Operator has been set!");
    } catch (error: any) {
      window.alert(
        "Error!" + (error && error.message ? `\n\n${error.message}` : "")
      );
    }
  }

  async function handleSendVouchers() {
    if (!voucherStoreContract) {
      window.alert("Undefined voucherContract");
      return;
    }
    let validVouchers = accountVouchers.filter(
      (a) => a.recipient && a.send !== true
    );

    if (!validVouchers) {
      window.alert("No valid vouchers found.");
      return;
    }
    try {
      let recipients: string[] = validVouchers.map((a) =>
        a.recipient ? a.recipient : ""
      );
      let codes: string[] = validVouchers.map((a) => a.code);

      let tx = await voucherStoreContract.sendVouchers(recipients, codes);

      for (let i = 0; i < validVouchers.length; i++) {
        let url = "http://localhost:3004/data/" + validVouchers[i].id;
        const sender = signer ? await signer.getAddress() : "";
        const requestOptions = {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: validVouchers[i].id,
            code: validVouchers[i].code,
            amount: validVouchers[i].amount,
            contractAddress: voucherStoreContractAddr,
            pledger: sender,
            recipient: validVouchers[i].recipient,
            send: true,
          }),
        };
        await fetch(url, requestOptions).then((response) => response.json());
      }

      accountVouchers.forEach((voucher) => {
        const updatedVoucher = validVouchers.find(
          (updateVoucher) => updateVoucher.id === voucher.id
        );
        if (updatedVoucher) {
          voucher.send = true;
        }
      });

      setAccountVouchers(accountVouchers);
    } catch (error: any) {
      window.alert(
        "Error!" + (error && error.message ? `\n\n${error.message}` : "")
      );
    }
  }

  async function handleAddVouchers() {
    if (!voucherStoreContract) {
      window.alert("Undefined greeterContract");
      return;
    }
    try {
      const voucherAmounts = inputFields.map((a) =>
        ethers.utils.parseEther(a.value.toString())
      );
      let tx = await voucherStoreContract.addVouchers(voucherAmounts);
      const receipt = await tx.wait();
      let iface = new ethers.utils.Interface(VoucherStoreArtifact.abi);
      let vouchers: TVoucher[] = [];
      for (let i = 0; i < receipt.logs.length; i++) {
        let fCode = generateRandomString(8);
        const receiptArgs = iface.parseLog(receipt.logs[i]).args;
        const _amount = receiptArgs[2].toString();
        vouchers.push({
          code: receiptArgs[1],
          amount: _amount,
          id: fCode,
        });
      }
      setAccountVouchers(vouchers);
      postRequestVoucherCreated(vouchers);
    } catch (error: any) {
      window.alert(
        "Error!" + (error && error.message ? `\n\n${error.message}` : "")
      );
    }
  }

  function handleDepositAmountChange(
    event: ChangeEvent<HTMLInputElement>
  ): void {
    event.preventDefault();
    setDepositAmount(event.target.value);
  }

  function handleOperatorChange(event: ChangeEvent<HTMLInputElement>): void {
    event.preventDefault();
    setOperatorInput(event.target.value);
  }

  return (
    <>
      <StyledDeployContractButton
        disabled={!active || voucherStoreContract ? true : false}
        style={{
          cursor: !active || voucherStoreContract ? "not-allowed" : "pointer",
          borderColor: !active || voucherStoreContract ? "unset" : "blue",
        }}
        onClick={handleDeployContract}
      >
        Deploy Voucher Contract
      </StyledDeployContractButton>
      <SectionDivider />
      <StyledGreetingDiv>
        <StyledLabel>Contract addr</StyledLabel>
        <div>
          {voucherStoreContractAddr ? (
            voucherStoreContractAddr
          ) : (
            <em>{`<Contract not yet deployed>`}</em>
          )}
        </div>
        <div></div>

        <StyledLabel>Contract amount</StyledLabel>
        <div>
          {fundedAmount ? (
            ethers.utils.formatEther(fundedAmount) + " ETH"
          ) : (
            <em>{`<Contract not yet funded>`}</em>
          )}
        </div>

        {/* empty placeholder div below to provide empty first row, 3rd col div for a 2x3 grid */}
        <div></div>

        <StyledLabel htmlFor="depositAmount">Set deposit amount</StyledLabel>
        <StyledInput
          id="depositAmount"
          type="text"
          onChange={handleDepositAmountChange}
          placeholder="Set deposit Amount"
        ></StyledInput>
        <StyledButton
          disabled={!active || !voucherStoreContract ? true : false}
          style={{
            cursor:
              !active || !voucherStoreContract ? "not-allowed" : "pointer",
            borderColor: !active || !voucherStoreContract ? "unset" : "blue",
          }}
          onClick={handleDeposit}
        >
          Submit
        </StyledButton>
        <StyledLabel htmlFor="operatorAdress">Set an operator</StyledLabel>
        <StyledInput
          id="depositAmoperatorAdressount"
          type="text"
          onChange={handleOperatorChange}
          placeholder="Operator address (0x...)"
        ></StyledInput>
        <StyledButton
          disabled={!active || !voucherStoreContract ? true : false}
          style={{
            cursor:
              !active || !voucherStoreContract ? "not-allowed" : "pointer",
            borderColor: !active || !voucherStoreContract ? "unset" : "blue",
          }}
          onClick={handleSetOperator}
        >
          Submit
        </StyledButton>
      </StyledGreetingDiv>
      <SectionDivider />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <VoucherTable data={accountVouchers} />
      </div>
      <SectionDivider />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        {renderInputFields()}
        <button onClick={handleAddFields}>Add Field</button>
      </div>
      <StyledDeployContractButton
        disabled={!active || !voucherStoreContract ? true : false}
        style={{
          cursor: !active || !voucherStoreContract ? "not-allowed" : "pointer",
          borderColor: !active || !voucherStoreContract ? "unset" : "blue",
        }}
        onClick={handleAddVouchers}
      >
        Add vouchers
      </StyledDeployContractButton>
      <SectionDivider />
      <StyledDeployContractButton
        disabled={!active || !voucherStoreContract ? true : false}
        style={{
          cursor: !active || !voucherStoreContract ? "not-allowed" : "pointer",
          borderColor: !active || !voucherStoreContract ? "unset" : "blue",
        }}
        onClick={handleSendVouchers}
      >
        Send Vouchers
      </StyledDeployContractButton>

      <SectionDivider />
      <StyledDeployContractButton
        disabled={!active || !voucherStoreContract ? true : false}
        style={{
          cursor: !active || !voucherStoreContract ? "not-allowed" : "pointer",
          borderColor: !active || !voucherStoreContract ? "unset" : "blue",
        }}
        onClick={depleteVouchers}
      >
        Reclaim Vouchers
      </StyledDeployContractButton>

      <SectionDivider />
      <StyledDeployContractButton
        disabled={!active || !voucherStoreContract ? true : false}
        style={{
          cursor: !active || !voucherStoreContract ? "not-allowed" : "pointer",
          borderColor: !active || !voucherStoreContract ? "unset" : "blue",
        }}
        onClick={withdrawBalance}
      >
        Withdraw Funds
      </StyledDeployContractButton>

      {/* <SectionDivider />
      <StyledDeployContractButton
        disabled={!active || !voucherStoreContract ? true : false}
        style={{
          cursor: !active || !voucherStoreContract ? "not-allowed" : "pointer",
          borderColor: !active || !voucherStoreContract ? "unset" : "blue",
        }}
        onClick={getDepositAmount}
      >
        Get Deposit Amount
      </StyledDeployContractButton> */}
    </>
  );
}
