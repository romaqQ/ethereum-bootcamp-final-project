import { ReactElement, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";
import { Contract, ethers, Signer } from "ethers";
import { Provider } from "../utils/provider";
import VoucherStoreArtifact from "../artifacts/contracts/VoucherStore.sol/VoucherStore.json";

export function ClaimVoucher(): ReactElement {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const contractAddress = queryParams.get("contract");
  const senderAddress = queryParams.get("sender");
  const smartContractCode = queryParams.get("scode");
  const frontendCode = queryParams.get("fcode");

  const context = useWeb3React<Provider>();
  var url = "http://localhost:8545";
  var provider = new ethers.providers.JsonRpcProvider(url);
  const [signer, setSigner] = useState<string>("");
  const [voucherStoreContract, setVoucherStoreContract] = useState<Contract>();
  const [voucherStoreContractAddr, setVoucherStoreContractAddr] =
    useState<string>("");
  const [voucherPledgerAddress, setVoucherPledgeAddress] = useState<string>("");
  const [voucherAmount, setVoucherAmount] = useState<string>("0");

  async function handleClaim() {
    let url = "http://localhost:3004/data/" + voucherPledgerAddress;
    const requestOptions = {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
    };
    console.log("TODO");
    // await fetch(url, requestOptions)
    //   .then((response) => response.json())
    //   .then(function (data) {
    //     if (data.contractAddress === contract && data.frontendCode === fcode) {
    //       for (let i = 0; i < data.vouchers.length; i++) {
    //         if (data.vouchers[i].code === scode) {
    //           setVoucherAmount(data.vouchers[i].amount);
    //         }
    //       }
    //     } else {
    //       window.alert("Unknown combination");
    //     }
    //   });
  }

  async function getVoucher(
    sender: string,
    contract: string,
    scode: string,
    fcode: string
  ) {
    let url = "http://localhost:3004/data/" + sender;
    const requestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    };
    let found = false;
    let foundAmount = "";
    await fetch(url, requestOptions)
      .then((response) => response.json())
      .then(function (data) {
        if (data.contractAddress === contract && data.frontendCode === fcode) {
          for (let i = 0; i < data.vouchers.length; i++) {
            if (data.vouchers[i].code === scode) {
              found = true;
              foundAmount = data.vouchers[i].amount;
            }
          }
          if (found) {
            setVoucherAmount(foundAmount);
            setVoucherStoreContractAddr(contract);
            setVoucherPledgeAddress(sender);
          } else {
            window.alert("Unknown combination");
          }
        } else {
          window.alert("Unknown combination");
        }
      });
  }

  useEffect((): void => {
    if (!context.account) {
      window.alert("Please connect your wallet to continue");
    } else {
      setSigner(context.account);
    }
    if (contractAddress && senderAddress && smartContractCode && frontendCode) {
      getVoucher(
        senderAddress,
        contractAddress,
        smartContractCode,
        frontendCode
      );
      const contract = new ethers.Contract(
        contractAddress,
        VoucherStoreArtifact.abi,
        provider
      );
      setVoucherStoreContractAddr(contractAddress);
      setVoucherStoreContract(contract);
    } else {
      window.alert("Unknown contract");
    }
  }, []);

  return (
    <>
      <p>You are qualified to claim a Voucher of: </p>
      {ethers.utils.formatEther(voucherAmount)} <p>ETH</p>
      <button onClick={handleClaim}>Claim now</button>
    </>
  );
}
