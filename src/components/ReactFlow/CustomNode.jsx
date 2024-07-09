import React from "react";
import { Handle } from "reactflow";

const CustomNode = ({ data, style }) => (
  <div
    className="customNode"
    style={{
      padding: 10,
      position: "relative",
      ...style, // Spread the style object to apply border and backgroundColor
    }}
  >
    {data.label}
    <Handle
      type="source"
      position="right"
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        right: -5,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "16px",
        fontWeight: "bold"
      }}
    >
      +
    </Handle>
    <Handle
      type="target"
      position="left"
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        left: -5,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "16px",
        fontWeight: "bold"
      }}
    >
      +
    </Handle>
  </div>
);

export default CustomNode;
