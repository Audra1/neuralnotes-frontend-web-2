/*
Order selector:
- select the prered order of the file
  1. Everytime a FilePage is rendered this should call 


*/

import React, { useState, useRef, useEffect } from 'react';
import './OrderSelector.css';



const ORDER_OPTIONS = [
  { value: 'latest-last', label: 'Latest Last (Default)' },
  { value: 'latest-first', label: 'Latest First' }
];


export default function OrderSelector({ currentOrder, onOrderChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentOption = ORDER_OPTIONS.find(option => option.value === currentOrder) || ORDER_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionSelect = (orderValue) => {
    console.log('OrderSelector: Selected order:', orderValue);
    console.log('OrderSelector: Calling onOrderChange with:', orderValue);
    onOrderChange(orderValue);
    setIsOpen(false);
  };

  // Don't render if currentOrder is still null (loading from file)
  if (!currentOrder) {
    return <div className="order-selector">Loading order preference...</div>;
  }

  return (
    <div className="order-selector" ref={dropdownRef}>
      <button 
        className="order-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="order-text">Order: {currentOption.label}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="order-dropdown">
          {ORDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`order-option ${currentOrder === option.value ? 'selected' : ''}`}
              onClick={() => handleOptionSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
