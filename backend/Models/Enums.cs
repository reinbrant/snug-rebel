using System;

namespace backend.Models;

public enum AddressType { Shipping, Billing }
public enum DiscountType { Percentage, FixedAmount }
public enum OrderStatus { Pending, Paid, Processing, Shipped, Delivered, Cancelled, Refunded }
public enum PaymentMethod { Cod, CodEwallet, Gcash, Maya, Card, BankTransfer }
public enum PaymentStatus { Pending, Authorized, Paid, Failed, Refunded }
public enum ShipmentStatus { Preparing, InTransit, Delivered, Returned }
public enum UserRole { Customer, Admin, Staff }
