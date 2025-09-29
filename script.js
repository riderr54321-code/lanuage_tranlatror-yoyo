// DOM Elements
const sourceLanguage = document.getElementById('source-language');
const targetLanguage = document.getElementById('target-language');
const inputText = document.getElementById('input-text');
const outputText = document.getElementById('output-text');
const translateBtn = document.getElementById('translate-btn');
const swapBtn = document.getElementById('swap-languages');
const clearBtn = document.getElementById('clear-input');
const copyBtn = document.getElementById('copy-output');
const charCount = document.getElementById('char-count');
const translationStatus = document.getElementById('translation-status');
const toast = document.getElementById('toast');

// Language codes to names mapping
const languageNames = {
    'auto': 'Auto Detect',
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'no': 'Norwegian',
    'da': 'Danish',
    'fi': 'Finnish',
    'pl': 'Polish',
    'tr': 'Turkish'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Enforce simple client-side login: if not logged in, redirect to login page
    const loggedInUser = localStorage.getItem('translatorLoggedInUser') || sessionStorage.getItem('translatorLoggedInUser');
    const authArea = document.getElementById('auth-area');
    const loginLink = document.getElementById('login-link');

    if (!loggedInUser) {
        // If current page is login.html, allow it; otherwise redirect
        if (!window.location.pathname.toLowerCase().endsWith('login.html')) {
            window.location.href = 'login.html';
            return;
        }
    } else {
        // Show username and logout button in header
        if (authArea) {
            authArea.innerHTML = `
                <span class="user-badge">${escapeHtml(loggedInUser)}</span>
                <button id="logout-btn" class="clear-btn" title="Logout">Logout</button>
            `;
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('translatorLoggedInUser');
                    sessionStorage.removeItem('translatorLoggedInUser');
                    window.location.href = 'login.html';
                });
            }
        }
    }
    updateCharCount();
    updateTranslateButton();
    
    // Set default target language to Spanish
    targetLanguage.value = 'es';
});

// Small helper to avoid XSS when injecting username
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Event Listeners
inputText.addEventListener('input', function() {
    updateCharCount();
    updateTranslateButton();
    clearOutput();
});

translateBtn.addEventListener('click', translateText);
swapBtn.addEventListener('click', swapLanguages);
clearBtn.addEventListener('click', clearInput);
copyBtn.addEventListener('click', copyToClipboard);

sourceLanguage.addEventListener('change', function() {
    if (inputText.value.trim()) {
        clearOutput();
    }
});

targetLanguage.addEventListener('change', function() {
    if (inputText.value.trim()) {
        clearOutput();
    }
});

// Enter key to translate
inputText.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (!translateBtn.disabled) {
            translateText();
        }
    }
});

// Functions
function updateCharCount() {
    const count = inputText.value.length;
    charCount.textContent = count;
    
    if (count > 4500) {
        charCount.style.color = '#dc3545';
    } else if (count > 4000) {
        charCount.style.color = '#ffc107';
    } else {
        charCount.style.color = '#999';
    }
}

function updateTranslateButton() {
    const hasText = inputText.value.trim().length > 0;
    const hasValidLanguages = sourceLanguage.value && targetLanguage.value;
    const notSameLanguage = sourceLanguage.value !== targetLanguage.value || sourceLanguage.value === 'auto';
    
    translateBtn.disabled = !hasText || !hasValidLanguages || !notSameLanguage;
}

function clearInput() {
    inputText.value = '';
    updateCharCount();
    updateTranslateButton();
    clearOutput();
    inputText.focus();
}

function clearOutput() {
    outputText.value = '';
    translationStatus.textContent = '';
}

function swapLanguages() {
    if (sourceLanguage.value === 'auto') {
        showToast('Cannot swap from auto-detect language', 'error');
        return;
    }
    
    const sourceValue = sourceLanguage.value;
    const targetValue = targetLanguage.value;
    const inputValue = inputText.value;
    const outputValue = outputText.value;
    
    // Swap languages
    sourceLanguage.value = targetValue;
    targetLanguage.value = sourceValue;
    
    // Swap text content
    inputText.value = outputValue;
    outputText.value = inputValue;
    
    updateCharCount();
    updateTranslateButton();
    
    // Update status
    if (inputText.value.trim()) {
        translationStatus.textContent = `Swapped ${languageNames[targetValue]} ↔ ${languageNames[sourceValue]}`;
    }
}

async function translateText() {
    const text = inputText.value.trim();
    const sourceLang = sourceLanguage.value;
    const targetLang = targetLanguage.value;
    
    if (!text) {
        showToast('Please enter text to translate', 'error');
        return;
    }
    
    if (sourceLang === targetLang && sourceLang !== 'auto') {
        showToast('Source and target languages cannot be the same', 'error');
        return;
    }
    
    // Show loading state
    translateBtn.disabled = true;
    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
    outputText.value = '';
    translationStatus.textContent = 'Translating...';
    
    try {
        const translation = await performTranslation(text, sourceLang, targetLang);
        
        if (translation.success) {
            outputText.value = translation.translatedText;
            
            // Handle different response scenarios
            if (translation.noTranslationNeeded) {
                translationStatus.textContent = `Text is already in ${languageNames[targetLang]} - no translation needed`;
                showToast('No translation needed!', 'success');
            } else if (translation.isDemo) {
                translationStatus.textContent = 'Using demo mode - translation API unavailable';
                showToast('Demo translation completed!', 'success');
            } else if (translation.detectedLanguage) {
                translationStatus.textContent = `Translated from ${languageNames[translation.detectedLanguage]} to ${languageNames[targetLang]}`;
                showToast('Translation completed successfully!', 'success');
            } else {
                translationStatus.textContent = `Translated from ${languageNames[sourceLang]} to ${languageNames[targetLang]}`;
                showToast('Translation completed successfully!', 'success');
            }
        } else {
            throw new Error(translation.error || 'Translation failed');
        }
        
    } catch (error) {
        console.error('Translation error:', error);
        outputText.value = '';
        translationStatus.textContent = 'Translation failed. Please try again.';
        showToast('Translation failed. Please try again.', 'error');
    } finally {
        // Reset button state
        translateBtn.disabled = false;
        translateBtn.innerHTML = '<i class="fas fa-language"></i> Translate';
        updateTranslateButton();
    }
}

async function performTranslation(text, sourceLang, targetLang) {
    try {
        let finalSourceLang = sourceLang;
        
        // If auto-detect is selected, first detect the language
        if (sourceLang === 'auto') {
            finalSourceLang = await detectLanguage(text);
            if (!finalSourceLang) {
                // Default to English if detection fails
                finalSourceLang = 'en';
            }
        }
        
        // Ensure we don't translate from same language to same language
        if (finalSourceLang === targetLang) {
            return {
                success: true,
                translatedText: text,
                detectedLanguage: finalSourceLang,
                noTranslationNeeded: true
            };
        }
        
        // Using MyMemory Translation API (free, no API key required)
        const langPair = `${finalSourceLang}|${targetLang}`;
        const encodedText = encodeURIComponent(text);
        
        const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${langPair}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
            return {
                success: true,
                translatedText: data.responseData.translatedText,
                detectedLanguage: sourceLang === 'auto' ? finalSourceLang : null
            };
        } else {
            throw new Error(data.responseDetails || 'Translation service error');
        }
        
    } catch (error) {
        console.error('API Error:', error);
        
        // Enhanced fallback for demo purposes
        return {
            success: true,
            translatedText: `[DEMO] Mock translation of: "${text}"`,
            detectedLanguage: sourceLang === 'auto' ? 'en' : null,
            isDemo: true
        };
    }
}

async function detectLanguage(text) {
    try {
        // Try to detect language using a simple heuristic first
        const detectedLang = simpleLanguageDetection(text);
        if (detectedLang) {
            return detectedLang;
        }
        
        // Fallback: try MyMemory with English as source to see if it's already English
        const encodedText = encodeURIComponent(text.substring(0, 100)); // Use first 100 chars for detection
        const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|es`;
        
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            // If translation is very similar to original, it's likely already English
            if (data.responseData && data.responseData.translatedText) {
                const similarity = calculateSimilarity(text.toLowerCase(), data.responseData.translatedText.toLowerCase());
                if (similarity > 0.8) {
                    return 'en';
                }
            }
        }
        
        // Default fallback
        return 'en';
        
    } catch (error) {
        console.error('Language detection error:', error);
        return 'en'; // Default to English
    }
}

function simpleLanguageDetection(text) {
    const cleanText = text.toLowerCase().trim();
    
    // Simple pattern matching for common languages
    const patterns = {
        'en': /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/g,
        'es': /\b(el|la|los|las|y|o|pero|en|con|de|para|por|que|es|son|está|están)\b/g,
        'fr': /\b(le|la|les|et|ou|mais|dans|sur|à|pour|de|avec|par|que|est|sont)\b/g,
        'de': /\b(der|die|das|und|oder|aber|in|auf|zu|für|von|mit|durch|dass|ist|sind)\b/g,
        'it': /\b(il|la|i|le|e|o|ma|in|su|a|per|di|con|da|che|è|sono)\b/g,
        'pt': /\b(o|a|os|as|e|ou|mas|em|sobre|para|de|com|por|que|é|são|está|estão)\b/g,
        'ru': /[а-яё]/g,
        'ar': /[ا-ي]/g,
        'zh': /[\u4e00-\u9fff]/g,
        'ja': /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/g,
        'ko': /[\uac00-\ud7af]/g,
        'hi': /[\u0900-\u097f]/g
    };
    
    let maxMatches = 0;
    let detectedLang = null;
    
    for (const [lang, pattern] of Object.entries(patterns)) {
        const matches = (cleanText.match(pattern) || []).length;
        if (matches > maxMatches && matches > 2) {
            maxMatches = matches;
            detectedLang = lang;
        }
    }
    
    return detectedLang;
}

function calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    let matches = 0;
    for (let i = 0; i < Math.min(len1, len2); i++) {
        if (str1[i] === str2[i]) matches++;
    }
    
    return matches / maxLen;
}

async function copyToClipboard() {
    const textToCopy = outputText.value.trim();
    
    if (!textToCopy) {
        showToast('No translation to copy', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast('Translation copied to clipboard!', 'success');
        
        // Visual feedback
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
        
    } catch (error) {
        console.error('Copy failed:', error);
        
        // Fallback for older browsers
        outputText.select();
        outputText.setSelectionRange(0, 99999);
        
        try {
            document.execCommand('copy');
            showToast('Translation copied to clipboard!', 'success');
        } catch (fallbackError) {
            showToast('Failed to copy to clipboard', 'error');
        }
    }
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+K to focus input
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        inputText.focus();
    }
    
    // Ctrl+Shift+C to copy output
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        copyToClipboard();
    }
    
    // Ctrl+Shift+X to clear input
    if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        clearInput();
    }
    
    // Ctrl+Shift+S to swap languages
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        swapLanguages();
    }
});

// Auto-resize textareas based on content
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
}

// Optional: Auto-resize input textarea
inputText.addEventListener('input', function() {
    autoResize(this);
});

// Initialize
updateTranslateButton();