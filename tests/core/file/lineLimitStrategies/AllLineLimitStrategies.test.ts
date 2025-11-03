import { describe, expect, test } from 'vitest';
import { LineLimitProcessor } from '../../../../src/core/file/lineLimitProcessor.js';
import { LineLimitStrategyRegistry } from '../../../../src/core/file/lineLimitStrategies/LineLimitStrategyRegistry.js';
import type { LineLimitConfig } from '../../../../src/core/file/lineLimitTypes.js';

describe('AllLineLimitStrategies', () => {
  const config: LineLimitConfig = {
    lineLimit: 50,
    preserveStructure: true,
    showTruncationIndicators: true,
    enableCaching: true,
  };

  describe('Strategy Registration', () => {
    test('should register all supported languages', () => {
      const supportedLanguages = LineLimitStrategyRegistry.getSupportedLanguages();

      expect(supportedLanguages).toContain('typescript');
      expect(supportedLanguages).toContain('python');
      expect(supportedLanguages).toContain('java');
      expect(supportedLanguages).toContain('go');
      expect(supportedLanguages).toContain('c');
      expect(supportedLanguages).toContain('cpp');
      expect(supportedLanguages).toContain('c_sharp');
      expect(supportedLanguages).toContain('rust');
      expect(supportedLanguages).toContain('php');
      expect(supportedLanguages).toContain('ruby');
      expect(supportedLanguages).toContain('swift');
      expect(supportedLanguages).toContain('kotlin');
      expect(supportedLanguages).toContain('dart');
    });

    test('should provide strategy for each language', () => {
      const languages = [
        'typescript',
        'python',
        'java',
        'go',
        'c',
        'cpp',
        'c_sharp',
        'rust',
        'php',
        'ruby',
        'swift',
        'kotlin',
        'dart',
      ];

      languages.forEach((language) => {
        const strategy = LineLimitStrategyRegistry.getStrategy(language as any);
        expect(strategy).toBeDefined();
        expect(strategy).toHaveProperty('identifyHeaderLines');
        expect(strategy).toHaveProperty('analyzeFunctions');
        expect(strategy).toHaveProperty('identifyFooterLines');
        expect(strategy).toHaveProperty('calculateComplexity');
      });
    });
  });

  describe('Language-Specific Tests', () => {
    test('should handle Python code correctly', async () => {
      const processor = new LineLimitProcessor();
      await processor.initialize('test.py');

      const content = `
#!/usr/bin/env python3
import os
import sys
from typing import List, Dict

class UserService:
    def __init__(self):
        self.users = {}
    
    def get_user(self, user_id: int) -> Dict:
        if user_id > 0:
            for i in range(10):
                if i == user_id:
                    return {"id": user_id, "name": "John"}
        return None
    
    def save_user(self, user: Dict) -> bool:
        self.users[user["id"]] = user
        return True

if __name__ == "__main__":
    service = UserService()
    user = service.get_user(1)
    print(user)
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.py', config);

      expect(result.metadata.language).toBe('python');
      expect(result.selectedLines.length).toBeGreaterThan(0);
      expect(result.selectedLines.length).toBeLessThanOrEqual(50);

      processor.dispose();
    });

    test('should handle Java code correctly', async () => {
      const processor = new LineLimitProcessor();
      await processor.initialize('Test.java');

      const content = `
package com.example;

import java.util.List;
import java.util.ArrayList;

public class UserService {
    private List<User> users = new ArrayList<>();
    
    public UserService() {
        // Initialize users
    }
    
    public User getUser(int id) {
        if (id > 0) {
            for (User user : users) {
                if (user.getId() == id) {
                    return user;
                }
            }
        }
        return null;
    }
    
    public boolean saveUser(User user) {
        try {
            users.add(user);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    public static void main(String[] args) {
        UserService service = new UserService();
        User user = service.getUser(1);
        System.out.println(user);
    }
}
      `.trim();

      const result = await processor.applyLineLimit(content, 'Test.java', config);

      expect(result.metadata.language).toBe('java');
      expect(result.selectedLines.length).toBeGreaterThan(0);
      expect(result.selectedLines.length).toBeLessThanOrEqual(50);

      processor.dispose();
    });

    test('should handle Go code correctly', async () => {
      const processor = new LineLimitProcessor();
      await processor.initialize('main.go');

      const content = `
package main

import (
    "fmt"
    "os"
)

type User struct {
    ID   int
    Name string
}

type UserService struct {
    users map[int]User
}

func NewUserService() *UserService {
    return &UserService{
        users: make(map[int]User),
    }
}

func (s *UserService) GetUser(id int) *User {
    if id > 0 {
        for _, user := range s.users {
            if user.ID == id {
                return &user
            }
        }
    }
    return nil
}

func (s *UserService) SaveUser(user User) bool {
    s.users[user.ID] = user
    return true
}

func main() {
    service := NewUserService()
    user := service.GetUser(1)
    if user != nil {
        fmt.Printf("User: %+v\\n", user)
    }
    os.Exit(0)
}
      `.trim();

      const result = await processor.applyLineLimit(content, 'main.go', config);

      expect(result.metadata.language).toBe('go');
      expect(result.selectedLines.length).toBeGreaterThan(0);
      expect(result.selectedLines.length).toBeLessThanOrEqual(50);

      processor.dispose();
    });

    test('should handle C++ code correctly', async () => {
      const processor = new LineLimitProcessor();
      await processor.initialize('test.cpp');

      const content = `
#include <iostream>
#include <vector>
#include <string>

class User {
private:
    int id;
    std::string name;
    
public:
    User(int id, const std::string& name) : id(id), name(name) {}
    
    int getId() const { return id; }
    std::string getName() const { return name; }
};

class UserService {
private:
    std::vector<User> users;
    
public:
    UserService() {}
    
    User* getUser(int id) {
        if (id > 0) {
            for (auto& user : users) {
                if (user.getId() == id) {
                    return &user;
                }
            }
        }
        }
        return nullptr;
    }
    
    bool saveUser(const User& user) {
        try {
            users.push_back(user);
            return true;
        } catch (...) {
            return false;
        }
    }
};

int main() {
    UserService service;
    User* user = service.getUser(1);
    if (user) {
        std::cout << "User: " << user->getName() << std::endl;
    }
    return 0;
}
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.cpp', config);

      expect(result.metadata.language).toBe('cpp');
      expect(result.selectedLines.length).toBeGreaterThan(0);
      expect(result.selectedLines.length).toBeLessThanOrEqual(50);

      processor.dispose();
    });

    test('should handle Rust code correctly', async () => {
      const processor = new LineLimitProcessor();
      await processor.initialize('main.rs');

      const content = `
use std::collections::HashMap;

#[derive(Debug, Clone)]
struct User {
    id: i32,
    name: String,
}

struct UserService {
    users: HashMap<i32, User>,
}

impl UserService {
    fn new() -> Self {
        UserService {
            users: HashMap::new(),
        }
    }
    
    fn get_user(&self, id: i32) -> Option<&User> {
        if id > 0 {
            for (_, user) in &self.users {
                if user.id == id {
                    return Some(user);
                }
            }
        }
        None
    }
    
    fn save_user(&mut self, user: User) -> bool {
        self.users.insert(user.id, user);
        true
    }
}

fn main() {
    let service = UserService::new();
    match service.get_user(1) {
        Some(user) => println!("User: {:?}", user),
        None => println!("User not found"),
    }
}
      `.trim();

      const result = await processor.applyLineLimit(content, 'main.rs', config);

      expect(result.metadata.language).toBe('rust');
      expect(result.selectedLines.length).toBeGreaterThan(0);
      expect(result.selectedLines.length).toBeLessThanOrEqual(50);

      processor.dispose();
    });

    test('should handle PHP code correctly', async () => {
      const processor = new LineLimitProcessor();
      await processor.initialize('UserService.php');

      const content = `
<?php
require_once 'config.php';

class UserService {
    private $users = [];
    
    public function __construct() {
        // Initialize users
    }
    
    public function getUser($id) {
        if ($id > 0) {
            foreach ($this->users as $user) {
                if ($user['id'] == $id) {
                    return $user;
                }
            }
        }
        return null;
    }
    
    public function saveUser($user) {
        try {
            $this->users[$user['id']] = $user;
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
}

// Main execution
$service = new UserService();
$user = $service->getUser(1);
if ($user) {
    echo "User: " . $user['name'];
}
?>
      `.trim();

      const result = await processor.applyLineLimit(content, 'UserService.php', config);

      expect(result.metadata.language).toBe('php');
      expect(result.selectedLines.length).toBeGreaterThan(0);
      expect(result.selectedLines.length).toBeLessThanOrEqual(50);

      processor.dispose();
    });

    test('should handle Ruby code correctly', async () => {
      const processor = new LineLimitProcessor();
      await processor.initialize('user_service.rb');

      const content = `
require 'json'

class UserService
  def initialize
    @users = {}
  end
  
  def get_user(user_id)
    if user_id > 0
      @users.each do |id, user|
        return user if id == user_id
      end
    end
    nil
  end
  
  def save_user(user)
    begin
      @users[user['id']] = user
      true
    rescue
      false
    end
end

# Main execution
if __FILE__ == $0
  service = UserService.new
  user = service.get_user(1)
  if user
    puts "User: #{user['name']}"
  end
end
      `.trim();

      const result = await processor.applyLineLimit(content, 'user_service.rb', config);

      expect(result.metadata.language).toBe('ruby');
      expect(result.selectedLines.length).toBeGreaterThan(0);
      expect(result.selectedLines.length).toBeLessThanOrEqual(50);

      processor.dispose();
    });

    test('should handle Swift code correctly', async () => {
      const processor = new LineLimitProcessor();
      await processor.initialize('UserService.swift');

      const content = `
import Foundation

class User {
    let id: Int
    let name: String
    
    init(id: Int, name: String) {
        self.id = id
        self.name = name
    }
}

class UserService {
    private var users: [Int: User] = [:]
    
    init() {
        // Initialize users
    }
    
    func getUser(id: Int) -> User? {
        if id > 0 {
            for user in users.values {
                if user.id == id {
                    return user
                }
            }
        }
        return nil
    }
    
    func saveUser(_ user: User) -> Bool {
        do {
            users[user.id] = user
            return true
        } catch {
            return false
        }
    }
}

// Main execution
let service = UserService()
if let user = service.getUser(id: 1) {
    print("User: \\(user.name)")
}
      `.trim();

      const result = await processor.applyLineLimit(content, 'UserService.swift', config);

      expect(result.metadata.language).toBe('swift');
      expect(result.selectedLines.length).toBeGreaterThan(0);
      expect(result.selectedLines.length).toBeLessThanOrEqual(50);

      processor.dispose();
    });

    test('should handle Kotlin code correctly', async () => {
      const processor = new LineLimitProcessor();
      await processor.initialize('UserService.kt');

      const content = `
package com.example

import java.util.*

data class User(val id: Int, val name: String)

class UserService {
    private val users = mutableMapOf<Int, User>()
    
    init() {
        // Initialize users
    }
    
    fun getUser(id: Int): User? {
        return if (id > 0) {
            users.values.find { it.id == id }
        } else {
            null
        }
    }
    
    fun saveUser(user: User): Boolean {
        return try {
            users[user.id] = user
            true
        } catch (e: Exception) {
            false
        }
    }
}

fun main() {
    val service = UserService()
    val user = service.getUser(1)
    user?.let {
        println("User: ${it.name}")
    }
}
      `.trim();

      const result = await processor.applyLineLimit(content, 'UserService.kt', config);

      expect(result.metadata.language).toBe('kotlin');
      expect(result.selectedLines.length).toBeGreaterThan(0);
      expect(result.selectedLines.length).toBeLessThanOrEqual(50);

      processor.dispose();
    });

    test('should handle Dart code correctly', async () => {
      const processor = new LineLimitProcessor();
      await processor.initialize('user_service.dart');

      const content = `
import 'dart:convert';

class User {
  final int id;
  final String name;
  
  User({required this.id, required this.name});
}

class UserService {
  final Map<int, User> _users = {};
  
  UserService() {
    // Initialize users
  }
  
  User? getUser(int id) {
    if (id > 0) {
      return _users[id];
    }
    return null;
  }
  
  bool saveUser(User user) {
    try {
      _users[user.id] = user;
      return true;
    } catch (e) {
      return false;
    }
  }
}

void main() {
  final service = UserService();
  final user = service.getUser(1);
  if (user != null) {
    print('User: ${user.name}');
  }
}
      `.trim();

      const result = await processor.applyLineLimit(content, 'user_service.dart', config);

      expect(result.metadata.language).toBe('dart');
      expect(result.selectedLines.length).toBeGreaterThan(0);
      expect(result.selectedLines.length).toBeLessThanOrEqual(50);

      processor.dispose();
    });
  });

  describe('Error Handling', () => {
    test('should handle unsupported language gracefully', async () => {
      const processor = new LineLimitProcessor();

      await expect(processor.initialize('test.xyz')).rejects.toThrow('Unsupported language');

      processor.dispose();
    });

    test('should handle parse errors gracefully', async () => {
      const processor = new LineLimitProcessor();
      await processor.initialize('test.py');

      const invalidContent = 'def invalid syntax {{{';

      // Should not throw but handle gracefully
      const result = await processor.applyLineLimit(invalidContent, 'test.py', config);

      expect(result).toBeDefined();
      expect(result.selectedLines.length).toBeGreaterThan(0);

      processor.dispose();
    });
  });
});
