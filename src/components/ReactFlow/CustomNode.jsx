import React from "react";
import { Handle } from "reactflow";

const CustomNode = ({ data, id, isSelected }) => (
  <div
    className={`customNode ${isSelected ? 'selected' : ''}`}
    data-id={id} // Use id here to ensure it is utilized
    style={{
      padding: 10,
      border: "1px solid #ddd",
      borderRadius: 5,
      position: "relative",
      backgroundColor: data.backgroundColor || "#fff",
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
