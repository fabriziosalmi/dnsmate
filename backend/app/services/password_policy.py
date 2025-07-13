"""Password policy and validation"""

import re
import secrets
import string
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
import hashlib

from passlib.context import CryptContext
from passlib.hash import bcrypt


class PasswordPolicy:
    """Password policy configuration and validation"""
    
    def __init__(
        self,
        min_length: int = 8,
        max_length: int = 128,
        require_uppercase: bool = True,
        require_lowercase: bool = True,
        require_digits: bool = True,
        require_symbols: bool = True,
        min_unique_chars: int = 4,
        max_consecutive_chars: int = 3,
        prevent_common_passwords: bool = True,
        prevent_personal_info: bool = True,
        password_history_count: int = 5
    ):
        self.min_length = min_length
        self.max_length = max_length
        self.require_uppercase = require_uppercase
        self.require_lowercase = require_lowercase
        self.require_digits = require_digits
        self.require_symbols = require_symbols
        self.min_unique_chars = min_unique_chars
        self.max_consecutive_chars = max_consecutive_chars
        self.prevent_common_passwords = prevent_common_passwords
        self.prevent_personal_info = prevent_personal_info
        self.password_history_count = password_history_count
        
        # Common weak passwords (subset)
        self.common_passwords = {
            "password", "123456", "password123", "admin", "letmein",
            "welcome", "monkey", "1234567890", "qwerty", "abc123",
            "password1", "admin123", "root", "guest", "test",
            "user", "demo", "sample", "default", "temp"
        }
        
        # Symbol characters
        self.symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    def validate_password(
        self, 
        password: str, 
        user_info: Optional[dict] = None,
        password_history: Optional[List[str]] = None
    ) -> Tuple[bool, List[str]]:
        """
        Validate password against policy
        
        Args:
            password: The password to validate
            user_info: User information (email, first_name, last_name) for personal info check
            password_history: List of previous password hashes
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Length checks
        if len(password) < self.min_length:
            errors.append(f"Password must be at least {self.min_length} characters long")
        
        if len(password) > self.max_length:
            errors.append(f"Password must be no more than {self.max_length} characters long")
        
        # Character type requirements
        if self.require_uppercase and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if self.require_lowercase and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if self.require_digits and not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if self.require_symbols and not re.search(f'[{re.escape(self.symbols)}]', password):
            errors.append("Password must contain at least one special character")
        
        # Unique characters
        unique_chars = len(set(password))
        if unique_chars < self.min_unique_chars:
            errors.append(f"Password must contain at least {self.min_unique_chars} unique characters")
        
        # Consecutive characters check
        if self._has_consecutive_chars(password):
            errors.append(f"Password cannot contain more than {self.max_consecutive_chars} consecutive identical characters")
        
        # Common password check
        if self.prevent_common_passwords and password.lower() in self.common_passwords:
            errors.append("Password is too common and easily guessable")
        
        # Personal information check
        if self.prevent_personal_info and user_info:
            if self._contains_personal_info(password, user_info):
                errors.append("Password cannot contain personal information")
        
        # Password history check
        if password_history and self._is_in_history(password, password_history):
            errors.append(f"Password has been used recently. Please choose a different password")
        
        # Sequential characters check
        if self._has_sequential_chars(password):
            errors.append("Password cannot contain sequential characters (e.g., 123, abc)")
        
        # Keyboard patterns check
        if self._has_keyboard_pattern(password):
            errors.append("Password cannot contain keyboard patterns (e.g., qwerty, asdf)")
        
        return len(errors) == 0, errors
    
    def _has_consecutive_chars(self, password: str) -> bool:
        """Check for consecutive identical characters"""
        count = 1
        for i in range(1, len(password)):
            if password[i] == password[i-1]:
                count += 1
                if count > self.max_consecutive_chars:
                    return True
            else:
                count = 1
        return False
    
    def _contains_personal_info(self, password: str, user_info: dict) -> bool:
        """Check if password contains personal information"""
        password_lower = password.lower()
        
        # Check email parts
        if user_info.get('email'):
            email_parts = user_info['email'].lower().split('@')
            username = email_parts[0]
            if len(username) >= 3 and username in password_lower:
                return True
            
            # Check domain parts
            if len(email_parts) > 1:
                domain_parts = email_parts[1].split('.')
                for part in domain_parts:
                    if len(part) >= 3 and part in password_lower:
                        return True
        
        # Check name parts
        for field in ['first_name', 'last_name']:
            if user_info.get(field):
                name = user_info[field].lower()
                if len(name) >= 3 and name in password_lower:
                    return True
        
        return False
    
    def _is_in_history(self, password: str, password_history: List[str]) -> bool:
        """Check if password is in history"""
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        for old_hash in password_history[-self.password_history_count:]:
            if pwd_context.verify(password, old_hash):
                return True
        return False
    
    def _has_sequential_chars(self, password: str) -> bool:
        """Check for sequential characters"""
        sequences = [
            "0123456789",
            "abcdefghijklmnopqrstuvwxyz",
            "qwertyuiop",
            "asdfghjkl",
            "zxcvbnm"
        ]
        
        password_lower = password.lower()
        
        for seq in sequences:
            for i in range(len(seq) - 2):
                if seq[i:i+3] in password_lower or seq[i:i+3][::-1] in password_lower:
                    return True
        
        return False
    
    def _has_keyboard_pattern(self, password: str) -> bool:
        """Check for keyboard patterns"""
        keyboard_patterns = [
            "qwerty", "qwertz", "azerty", "asdf", "zxcv",
            "123456", "654321", "1qaz", "2wsx", "3edc"
        ]
        
        password_lower = password.lower()
        
        for pattern in keyboard_patterns:
            if pattern in password_lower:
                return True
        
        return False
    
    def generate_secure_password(self, length: int = 12) -> str:
        """Generate a secure password that meets the policy"""
        if length < self.min_length:
            length = self.min_length
        if length > self.max_length:
            length = self.max_length
        
        # Ensure we have required character types
        chars = ""
        required_chars = ""
        
        if self.require_lowercase:
            chars += string.ascii_lowercase
            required_chars += secrets.choice(string.ascii_lowercase)
        
        if self.require_uppercase:
            chars += string.ascii_uppercase
            required_chars += secrets.choice(string.ascii_uppercase)
        
        if self.require_digits:
            chars += string.digits
            required_chars += secrets.choice(string.digits)
        
        if self.require_symbols:
            chars += self.symbols
            required_chars += secrets.choice(self.symbols)
        
        # Fill the rest with random characters
        remaining_length = length - len(required_chars)
        if remaining_length > 0:
            random_chars = ''.join(secrets.choice(chars) for _ in range(remaining_length))
            password_chars = list(required_chars + random_chars)
        else:
            password_chars = list(required_chars[:length])
        
        # Shuffle the characters
        secrets.SystemRandom().shuffle(password_chars)
        password = ''.join(password_chars)
        
        # Validate the generated password
        is_valid, _ = self.validate_password(password)
        if not is_valid:
            # If somehow invalid, try again (shouldn't happen)
            return self.generate_secure_password(length)
        
        return password
    
    def get_password_strength_score(self, password: str) -> Tuple[int, str]:
        """
        Calculate password strength score (0-100)
        
        Returns:
            Tuple of (score, description)
        """
        score = 0
        
        # Length scoring (0-30 points)
        length_score = min(30, (len(password) - 4) * 3)
        score += max(0, length_score)
        
        # Character variety (0-40 points)
        variety_score = 0
        if re.search(r'[a-z]', password):
            variety_score += 5
        if re.search(r'[A-Z]', password):
            variety_score += 5
        if re.search(r'\d', password):
            variety_score += 10
        if re.search(f'[{re.escape(self.symbols)}]', password):
            variety_score += 15
        
        # Bonus for multiple of each type
        if len(re.findall(r'[a-z]', password)) >= 2:
            variety_score += 2
        if len(re.findall(r'[A-Z]', password)) >= 2:
            variety_score += 2
        if len(re.findall(r'\d', password)) >= 2:
            variety_score += 3
        if len(re.findall(f'[{re.escape(self.symbols)}]', password)) >= 2:
            variety_score += 3
        
        score += variety_score
        
        # Uniqueness (0-20 points)
        unique_chars = len(set(password))
        uniqueness_score = min(20, unique_chars * 2)
        score += uniqueness_score
        
        # Patterns penalty (0-10 points deduction)
        if self._has_sequential_chars(password):
            score -= 5
        if self._has_keyboard_pattern(password):
            score -= 5
        if self._has_consecutive_chars(password):
            score -= 5
        
        # Common password penalty
        if password.lower() in self.common_passwords:
            score -= 20
        
        # Ensure score is between 0 and 100
        score = max(0, min(100, score))
        
        # Determine description
        if score >= 80:
            description = "Very Strong"
        elif score >= 60:
            description = "Strong"
        elif score >= 40:
            description = "Moderate"
        elif score >= 20:
            description = "Weak"
        else:
            description = "Very Weak"
        
        return score, description


# Default password policy instance
default_password_policy = PasswordPolicy()
