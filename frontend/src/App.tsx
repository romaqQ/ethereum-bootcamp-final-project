import { ReactElement } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import styled from "styled-components";
import { ActivateDeactivate } from "./components/ActivateDeactivate";
import { Voucher } from "./components/Voucher";
import { SectionDivider } from "./components/SectionDivider";
import { SignMessage } from "./components/SignMessage";
import { WalletStatus } from "./components/WalletStatus";
import { ClaimVoucher } from "./components/ClaimVoucher";

const StyledAppDiv = styled.div`
  display: grid;
  grid-gap: 20px;
`;

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path=""
          element={
            <StyledAppDiv>
              <ActivateDeactivate />
              <SectionDivider />
              <WalletStatus />
              <SectionDivider />
              <Voucher />
              {/* <SectionDivider /> */}
              {/* <SignMessage /> */}
            </StyledAppDiv>
          }
        />
        <Route
          path="/claim"
          element={
            <StyledAppDiv>
              <ActivateDeactivate />
              <SectionDivider />
              <WalletStatus />
              <SectionDivider />
              <ClaimVoucher></ClaimVoucher>
              {/* <Voucher />
              <SectionDivider />
              <SignMessage /> */}
            </StyledAppDiv>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
