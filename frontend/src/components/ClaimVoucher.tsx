import { ChangeEvent, ReactElement, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";
import { ethers } from "ethers";
import { Provider } from "../utils/provider";
import { StyledInput, StyledLabel } from "./Voucher";

export function ClaimVoucher(): ReactElement {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const smartContractCode = queryParams.get("scode");
  const frontendCodeURL = queryParams.get("fcode");

  const context = useWeb3React<Provider>();
  const [signer, setSigner] = useState<string>("");
  const [frontendCode, setFrontendCode] = useState<string>();
  const [solidityCode, setSolidityCode] = useState<string>();
  const [voucherAmount, setVoucherAmount] = useState<string>("0");
  const [claimable, setClaimable] = useState<boolean>(false);
  const [voucherData, setVoucherData] = useState<any>();
  const [voucherCodeIndex, setVoucherCodeIndex] = useState<number>(0);

  async function handleClaim() {
    let url = "http://localhost:3004/data/" + frontendCode;
    voucherData.vouchers[voucherCodeIndex].recipient == signer;
    const requestOptions = {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(voucherData),
    };

    await fetch(url, requestOptions)
      .then((response) => response.json())
      .then((data) => console.log(data));
  }

  async function getVoucher() {
    let url = "http://localhost:3004/data/" + frontendCode;
    const requestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    };
    let found = false;
    let foundAmount = "";
    await fetch(url, requestOptions)
      .then((response) => response.json())
      .then(function (data) {
        for (let i = 0; i < data.vouchers.length; i++) {
          if (data.vouchers[i].code === solidityCode) {
            if (data.vouchers[i].claimer) {
              window.alert("Sorry, code was already claimed.");
            } else {
              setVoucherData(data);
              setVoucherCodeIndex(i);
              setVoucherAmount((foundAmount = data.vouchers[i].amount));
              setClaimable(true);
            }
            found = true;
          }
        }
        if (!found) {
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
    console.log(frontendCodeURL);
    setFrontendCode(frontendCodeURL ? frontendCodeURL : "");
    setSolidityCode(smartContractCode ? smartContractCode : "");
  }, []);

  function handleSolidityCode(event: ChangeEvent<HTMLInputElement>): void {
    event.preventDefault();
    setSolidityCode(event.target.value);
  }

  function handleFrontendCode(event: ChangeEvent<HTMLInputElement>): void {
    event.preventDefault();
    setFrontendCode(event.target.value);
  }

  return (
    <>
      <StyledLabel htmlFor="fCode">Set frontend code</StyledLabel>
      <StyledInput
        id="fCode"
        type="text"
        onChange={handleFrontendCode}
        value={frontendCode}
        placeholder="Set frontend code"
      ></StyledInput>
      <StyledLabel htmlFor="scode">Set backend code</StyledLabel>
      <StyledInput
        id="scode"
        type="text"
        onChange={handleSolidityCode}
        value={solidityCode}
        placeholder="Set backend code"
      ></StyledInput>
      {frontendCode && solidityCode && (
        <button onClick={getVoucher}>Verify Codes</button>
      )}
      {claimable && (
        <>
          <p>Congratulations! You are qualified to claim a Voucher of: </p>
          {ethers.utils.formatEther(voucherAmount)} <p>ETH</p>
          <button onClick={handleClaim}>Claim now</button>
        </>
      )}
    </>
  );
}
