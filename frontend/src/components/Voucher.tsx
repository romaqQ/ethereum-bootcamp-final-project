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

  useEffect((): void => {
    if (!library) {
      setSigner(undefined);
      return;
    }

    setSigner(library.getSigner());
  }, [library]);

  async function getDepositAmount(): Promise<void> {
    const _amount = (
      await provider.getBalance(voucherStoreContractAddr)
    ).toString();
    console.log("_amount", _amount);
    if (_amount !== _amount) {
      setDepositAmount(_amount);
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
      window.alert("Undefined greeterContract");
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
      <StyledButton
        disabled={!active || !voucherStoreContract ? true : false}
        style={{
          cursor: !active || !voucherStoreContract ? "not-allowed" : "pointer",
          borderColor: !active || !voucherStoreContract ? "unset" : "blue",
        }}
        onClick={getDepositAmount}
      >
        Submit
      </StyledButton>
    </>
  );
}
