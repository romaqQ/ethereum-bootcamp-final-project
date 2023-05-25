import { useWeb3React } from "@web3-react/core";
import { Contract, ethers, Signer } from "ethers";
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

const StyledDeployContractButton = styled.button`
  width: 180px;
  height: 2rem;
  border-radius: 1rem;
  border-color: blue;
  cursor: pointer;
  place-self: center;
`;

const StyledGreetingDiv = styled.div`
  display: grid;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-columns: 135px 2.7fr 1fr;
  grid-gap: 10px;
  place-self: center;
  align-items: center;
`;
// 0x19651D7d4892803Cc08cA62897C85640406b2075
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const StyledLabel = styled.label`
  font-weight: bold;
`;

const StyledInput = styled.input`
  padding: 0.4rem 0.6rem;
  line-height: 2fr;
`;

const StyledButton = styled.button`
  width: 150px;
  height: 2rem;
  border-radius: 1rem;
  border-color: blue;
  cursor: pointer;
`;

type TVoucher = {
  code: string;
  amount: string;
  recipient?: string;
};

export function Voucher(): ReactElement {
  const context = useWeb3React<Provider>();
  const { library, active } = context;
  var url = "http://localhost:8545";
  var provider = new ethers.providers.JsonRpcProvider(url);
  const [signer, setSigner] = useState<Signer>();
  const [voucherStoreContract, setVoucherStoreContract] = useState<Contract>();
  const [voucherStoreContractAddr, setVoucherStoreContractAddr] =
    useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [accountVouchers, setAccountVouchers] = useState<TVoucher[]>([]);
  const [createVoucherAmounts, setCreateVoucherAmounts] = useState<string[]>([
    "",
  ]);

  // function updateVoucherState(sender: string, code: string, amount: string) {
  //   console.log("UPDATE", accountVouchers);
  // }

  useEffect((): void => {
    if (!library) {
      setSigner(undefined);
      return;
    }
    setSigner(library.getSigner());
  }, [library]);

  async function postRequestVoucherCreated(vouchers: TVoucher[]) {
    const sender = signer ? await signer.getAddress() : "tmp";
    const frontendCode = "todo12345";
    let method = "PUT";
    let url = "http://localhost:3004/data/" + sender;
    await fetch(url)
      .then(async (response) => {
        if (response.ok) {
          return response.json();
        }
        method = "POST";
        url = "http://localhost:3004/data";
        throw new Error("Something went wrong");
      })
      .catch(() => console.log("error in get"));
    const requestOptions = {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sender,
        vouchers: vouchers,
        contractAddress: voucherStoreContractAddr,
        frontendCode: frontendCode,
      }),
    };

    await fetch(url, requestOptions)
      .then((response) => response.json())
      .then((data) => console.log("data", data));
  }

  async function getDepositAmount(): Promise<void> {
    const _amount = (
      await provider.getBalance(voucherStoreContractAddr)
    ).toString();
    console.log("_amount", _amount);
    if (_amount !== _amount) {
      setDepositAmount(_amount);
    }
    if (!voucherStoreContract || !signer) {
      return;
    }
    console.log("vouchers", accountVouchers);
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
        // setGreeting(greeting);

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
    try {
      let recipients: string[] = [];
      let codes = [];

      const testRecipients = [
        "0x999D60f0f58B032461B6a042DC9e4193e5F2687C",
        "0x6a940484d811C211B049e90Eb079a5d705A25a50",
      ];
      for (let i = 0; i < accountVouchers.length; i++) {
        recipients.push(testRecipients[i]);
        codes.push(accountVouchers[i].code);
      }
      let tx = await voucherStoreContract.sendVouchers(testRecipients, codes);
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
      let tx = await voucherStoreContract.addVouchers([
        ethers.utils.parseEther("2"),
        ethers.utils.parseEther("1"),
      ]);
      const receipt = await tx.wait();
      let iface = new ethers.utils.Interface(VoucherStoreArtifact.abi);
      let vouchers: TVoucher[] = [];
      for (let i = 0; i < receipt.logs.length; i++) {
        const receiptArgs = iface.parseLog(receipt.logs[i]).args;
        const _amount = receiptArgs[2].toString();
        vouchers.push({ code: receiptArgs[1], amount: _amount });
      }
      setAccountVouchers(vouchers);
      postRequestVoucherCreated(vouchers);
    } catch (error: any) {
      window.alert(
        "Error!" + (error && error.message ? `\n\n${error.message}` : "")
      );
    }
  }

  async function handleReclaimVouchers() {
    if (!voucherStoreContract) {
      window.alert("Undefined voucherContract");
      return;
    }
    try {
      let tx = await voucherStoreContract.addVouchers([
        ethers.utils.parseEther("2"),
        ethers.utils.parseEther("1"),
      ]);
      const receipt = await tx.wait();
      let iface = new ethers.utils.Interface(VoucherStoreArtifact.abi);
      let vouchers: TVoucher[] = [];
      for (let i = 0; i < receipt.logs.length; i++) {
        const receiptArgs = iface.parseLog(receipt.logs[i]).args;
        const _amount = receiptArgs[2].toString();
        vouchers.push({ code: receiptArgs[1], amount: _amount });
      }
      setAccountVouchers(vouchers);
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
        {/* empty placeholder div below to provide empty first row, 3rd col div for a 2x3 grid */}
        {/* <div></div>
        <StyledLabel></StyledLabel>
        <div>
          {"greeting" ? "greeting" : <em>{`<Contract not yet deployed>`}</em>}
        </div> */}
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
      </StyledGreetingDiv>
      <SectionDivider />
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
        onClick={getDepositAmount}
      >
        Get Deposit Amount
      </StyledDeployContractButton>
      {/* <StyledButton
        disabled={!active || !voucherStoreContract ? true : false}
        style={{
          cursor: !active || !voucherStoreContract ? "not-allowed" : "pointer",
          borderColor: !active || !voucherStoreContract ? "unset" : "blue",
        }}
        onClick={getDepositAmount}
      >
        Submit
      </StyledButton> */}
    </>
  );
}
