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
        background: "#555",
        width: 10,
        height: 10,
        borderRadius: "50%",
        right: -5,
        top: "50%",
        transform: "translateY(-50%)",
      }}
    />
    <Handle
      type="target"
      position="left"
      style={{
        background: "#555",
        width: 10,
        height: 10,
        borderRadius: "50%",
        left: -5,
        top: "50%",
        transform: "translateY(-50%)",
      }}
    />
  </div>
);

export default CustomNode;
