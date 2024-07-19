// ToggleSwitch.tsx
import React from "react";
import { styled } from "@mui/material/styles";

const Switch = styled("div")<{ checked: boolean }>(({ theme, checked }) => ({
  width: "36px",
  height: "20px",
  backgroundColor: checked ? "#1ED760" : "#333",
  borderRadius: "10px",
  position: "relative",
  cursor: "pointer",
  transition: "background-color 0.3s",
  "&::after": {
    content: '""',
    position: "absolute",
    top: "2px",
    left: checked ? "18px" : "2px",
    width: "16px",
    height: "16px",
    backgroundColor: "#fff",
    borderRadius: "50%",
    transition: "left 0.3s",
  },
}));

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange }) => {
  return <Switch checked={checked} onClick={onChange} />;
};

export default ToggleSwitch;
