# Code Compression

Code compression is a powerful feature that intelligently extracts essential code structures while removing implementation details. This is particularly useful for reducing token count while maintaining important structural information about your codebase.

> [!NOTE]  
> This is an experimental feature that we'll be actively improving based on user feedback and real-world usage

## Basic Usage

Enable code compression using the `--compress` flag:

```bash
repomix --compress
```

You can also use it with remote repositories:

```bash
repomix --remote user/repo --compress
```

## How It Works

The compression algorithm processes code using tree-sitter parsing to extract and preserve essential structural elements while removing implementation details.

The compression preserves:
- Function and method signatures
- Interface and type definitions
- Class structures and properties
- Important structural elements

While removing:
- Function and method implementations
- Loop and conditional logic details
- Internal variable declarations
- Implementation-specific code

### Example

Original TypeScript code:

```typescript
import { ShoppingItem } from './shopping-item';

/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

After compression:

```typescript
import { ShoppingItem } from './shopping-item';
⋮----
/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
⋮----
// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

## Configuration

You can enable compression in your configuration file:

```json
{
  "output": {
    "compress": true
  }
}
```

## Use Cases

Code compression is particularly useful when:
- Analyzing code structure and architecture
- Reducing token count for LLM processing
- Creating high-level documentation
- Understanding code patterns and signatures
- Sharing API and interface designs

## Related Options

You can combine compression with other options:
- `--remove-comments`: Remove code comments
- `--remove-empty-lines`: Remove empty lines
- `--output-show-line-numbers`: Add line numbers to output

## Performance Metrics

Code compression typically reduces token count by 30-70% depending on your codebase's characteristics:

| Code Type | Average Reduction | Notes |
|-----------|-------------------|-------|
| TypeScript | 40-60% | Type definitions preserved, implementation details removed |
| JavaScript | 35-55% | Function bodies condensed |
| Python | 30-50% | Docstrings preserved, implementation condensed |
| Java | 40-60% | Method signatures preserved, bodies removed |

## Advanced Compression Examples

### React Component Example

Original component:

```jsx
import React, { useState, useEffect } from 'react';

const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <div className="user-details">
        <p>Email: {user.email}</p>
        <p>Role: {user.role}</p>
      </div>
    </div>
  );
};

export default UserProfile;
```

After compression:

```jsx
import React, { useState, useEffect } from 'react';
⋮----
const UserProfile = ({ userId }) => {
⋮----
export default UserProfile;
```

### Backend API Example

Original code:

```typescript
import { Request, Response } from 'express';
import { User, UserRole } from '../models/user';
import { logger } from '../utils/logger';

export async function createUser(req: Request, res: Response) {
  try {
    const { name, email, role } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    const userRole = role || UserRole.STANDARD;
    const user = new User({ name, email, role: userRole });
    await user.save();
    
    logger.info(`Created new user: ${user.id}`);
    
    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
}
```

After compression:

```typescript
import { Request, Response } from 'express';
import { User, UserRole } from '../models/user';
import { logger } from '../utils/logger';

export async function createUser(req: Request, res: Response) {
⋮----
}
```

## Compression Strategies by Project Type

| Project Type | Recommended Settings | Benefits |
|--------------|---------------------|----------|
| Frontend Applications | `--compress --include "src/**" --ignore "**/*.test.*"` | Focuses on component interfaces and types |
| Backend Services | `--compress --include "src/**" --ignore "**/*.test.*,**/*.spec.*"` | Preserves API endpoints and service interfaces |
| Libraries | `--compress --include "src/**,lib/**" --ignore "**/*.test.*"` | Maintains public API while reducing implementation details |
| Documentation-heavy Projects | `--compress --remove-comments=false` | Preserves comments while reducing implementation details |
