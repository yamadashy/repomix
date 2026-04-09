# कोड कम्प्रेशन

Repomix का कोड कम्प्रेशन फीचर आपके कोडबेस को संक्षिप्त करने में मदद करता है, जिससे AI मॉडल के लिए टोकन उपयोग कम हो जाता है और बड़े कोडबेस को संभालना आसान हो जाता है।

## कोड कम्प्रेशन क्या है?

कोड कम्प्रेशन एक प्रक्रिया है जिसमें कोड के महत्वपूर्ण हिस्सों को बनाए रखते हुए कार्यान्वयन विवरण हटा दिए जाते हैं। यह फंक्शन और क्लास सिग्नेचर, इंटरफेस परिभाषाओं और महत्वपूर्ण लॉजिक पर ध्यान केंद्रित करता है।

## कोड कम्प्रेशन का उपयोग कैसे करें

कोड कम्प्रेशन सक्षम करने के लिए, `--compress` फ्लैग का उपयोग करें:

```bash
repomix --compress
```

## कॉन्फिगरेशन फाइल में कोड कम्प्रेशन

आप अपने `repomix.config.json` में भी कोड कम्प्रेशन को कॉन्फिगर कर सकते हैं:

```json
{
  "output": {
    "compress": true
  }
}
```

## कोड कम्प्रेशन कैसे काम करता है

कोड कम्प्रेशन निम्नलिखित तरीके से काम करता है:

1. **फंक्शन सिग्नेचर बनाए रखना**: फंक्शन के नाम, पैरामीटर और रिटर्न टाइप बनाए रखे जाते हैं
2. **कार्यान्वयन विवरण हटाना**: फंक्शन बॉडी को संक्षिप्त किया जाता है
3. **क्लास संरचना बनाए रखना**: क्लास परिभाषाएं, प्रॉपर्टी और मेथड सिग्नेचर बनाए रखे जाते हैं
4. **इंटरफेस और टाइप परिभाषाएं बनाए रखना**: टाइप सिस्टम जानकारी बनाए रखी जाती है

## उदाहरण

### कम्प्रेशन से पहले

```typescript
/**
 * उपयोगकर्ता प्रमाणीकरण सेवा
 */
class AuthService {
  private userRepository: UserRepository;
  private tokenService: TokenService;
  
  constructor(userRepo: UserRepository, tokenSvc: TokenService) {
    this.userRepository = userRepo;
    this.tokenService = tokenSvc;
  }
  
  /**
   * उपयोगकर्ता को प्रमाणित करता है और एक्सेस टोकन वापस करता है
   */
  async authenticate(username: string, password: string): Promise<string> {
    const user = await this.userRepository.findByUsername(username);
    
    if (!user) {
      throw new Error('उपयोगकर्ता नहीं मिला');
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      throw new Error('अमान्य क्रेडेंशियल');
    }
    
    const token = this.tokenService.generateToken({
      userId: user.id,
      role: user.role,
      permissions: user.permissions
    });
    
    await this.userRepository.updateLastLogin(user.id);
    
    return token;
  }
  
  // अन्य मेथड्स...
}
```

### कम्प्रेशन के बाद

```typescript
/**
 * उपयोगकर्ता प्रमाणीकरण सेवा
 */
class AuthService {
  private userRepository: UserRepository;
  private tokenService: TokenService;
  
  constructor(userRepo: UserRepository, tokenSvc: TokenService) {
    // कार्यान्वयन संक्षिप्त किया गया
  }
  
  /**
   * उपयोगकर्ता को प्रमाणित करता है और एक्सेस टोकन वापस करता है
   */
  async authenticate(username: string, password: string): Promise<string> {
    // कार्यान्वयन संक्षिप्त किया गया
  }
  
  // अन्य मेथड्स...
}
```

## कोड कम्प्रेशन के लाभ

1. **टोकन बचत**: AI मॉडल के लिए टोकन उपयोग कम करें
2. **बड़े कोडबेस**: बड़े कोडबेस को AI मॉडल की कॉन्टेक्स्ट विंडो में फिट करें
3. **संरचनात्मक समझ**: कोड की संरचना पर ध्यान केंद्रित करें, कार्यान्वयन विवरण पर नहीं
4. **संवेदनशील जानकारी**: कार्यान्वयन विवरण में छिपी संवेदनशील जानकारी को हटाएं

## सावधानियां

कोड कम्प्रेशन का उपयोग करते समय कुछ बातों का ध्यान रखें:

1. **कार्यान्वयन विवरण**: कम्प्रेशन कार्यान्वयन विवरण हटा देता है, जो कभी-कभी महत्वपूर्ण हो सकते हैं
2. **बग खोजना**: कम्प्रेस्ड कोड में बग खोजना कठिन हो सकता है
3. **AI समझ**: कुछ मामलों में, AI को कार्यान्वयन विवरण की आवश्यकता हो सकती है

## संबंधित संसाधन

- [टिप्पणी हटाना](/hi/guide/comment-removal) - टोकन संख्या और कम करने के लिए टिप्पणियां हटाएं
- [कॉन्फिगरेशन](/hi/guide/configuration) - अपनी कॉन्फिग फाइल में `output.compress` सेट करें
- [कमांड लाइन विकल्प](/hi/guide/command-line-options) - पूर्ण CLI संदर्भ
