<?php

class OrderService {
  private $repository;

  public function place($order) {
    $validator = new OrderValidator();
    $validator->validate($order);
    Logger::info("placing order");
    return save_order($order);
  }
}
