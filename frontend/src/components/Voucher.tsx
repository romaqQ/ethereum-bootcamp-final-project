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

  const [signer, setSigner] = useState<Signer>();
  const [voucherStoreContract, setVoucherStoreContract] = useState<Contract>();
  const [voucherStoreContractAddr, setVoucherStoreContractAddr] =
    useState<string>("");
  // const [greeting, setGreeting] = useState<string>('');
  // const [greetingInput, setGreetingInput] = useState<string>('');

  useEffect((): void => {
    if (!library) {
      setSigner(undefined);
      return;
    }

    setSigner(library.getSigner());
  }, [library]);

  // useEffect((): void => {
  //   if (!voucherStoreContract) {
  //     return;
  //   }

  //   async function getGreeting(greeterContract: Contract): Promise<void> {
  //     const _greeting = await greeterContract.greet();

  //     if (_greeting !== greeting) {
  //       setGreeting(_greeting);
  //     }
  //   }

  //   getGreeting(voucherContract);
  // }, [voucherContract, greeting]);

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

  // function handleGreetingChange(event: ChangeEvent<HTMLInputElement>): void {
  //   event.preventDefault();
  //   setGreetingInput(event.target.value);
  // }

  // function handleGreetingSubmit(event: MouseEvent<HTMLButtonElement>): void {
  //   event.preventDefault();

  //   if (!voucherContract) {
  //     window.alert("Undefined greeterContract");
  //     return;
  //   }

  //   if (!greetingInput) {
  //     window.alert("Greeting cannot be empty");
  //     return;
  //   }

  //   async function submitGreeting(greeterContract: Contract): Promise<void> {
  //     try {
  //       const setGreetingTxn = await greeterContract.setGreeting(greetingInput);

  //       await setGreetingTxn.wait();

  //       const newGreeting = await greeterContract.greet();
  //       window.alert(`Success!\n\nGreeting is now: ${newGreeting}`);

  //       if (newGreeting !== greeting) {
  //         setGreeting(newGreeting);
  //       }
  //     } catch (error: any) {
  //       window.alert(
  //         "Error!" + (error && error.message ? `\n\n${error.message}` : "")
  //       );
  //     }
  //   }

  //   submitGreeting(voucherContract);
  // }

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
        <div></div>
        <StyledLabel>Current greeting</StyledLabel>
        <div>
          {"greeting" ? "greeting" : <em>{`<Contract not yet deployed>`}</em>}
        </div>
        {/* empty placeholder div below to provide empty first row, 3rd col div for a 2x3 grid */}
        <div></div>
        <StyledLabel htmlFor="greetingInput">Set new greeting</StyledLabel>
        <StyledInput
          id="greetingInput"
          type="text"
          placeholder={"greeting" ? "" : "<Contract not yet deployed>"}
          style={{ fontStyle: "greeting" ? "normal" : "italic" }}
        ></StyledInput>
        <StyledButton
          disabled={!active || !voucherStoreContract ? true : false}
          style={{
            cursor:
              !active || !voucherStoreContract ? "not-allowed" : "pointer",
            borderColor: !active || !voucherStoreContract ? "unset" : "blue",
          }}
        >
          Submit
        </StyledButton>
      </StyledGreetingDiv>
    </>
  );
}
