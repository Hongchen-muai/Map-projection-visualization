<template>
  <div class="auth-modal-overlay" v-if="isVisible" @click.self="close">
    <div class="auth-modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ isLogin ? 'Sign In' : 'Create Account' }}</h2>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div class="input-group">
            <input 
              type="text" 
              v-model="username" 
              placeholder="Username" 
              required
              :class="{ 'has-error': errorMsg }"
            >
          </div>
          <div class="input-group">
            <input 
              type="password" 
              v-model="password" 
              placeholder="Password" 
              required
              :class="{ 'has-error': errorMsg }"
            >
          </div>
          
          <p class="error-msg" v-if="errorMsg">{{ errorMsg }}</p>
          
          <button type="submit" class="submit-btn" :disabled="isLoading">
            {{ isLoading ? 'Processing...' : (isLogin ? 'LOG IN' : 'REGISTER') }}
          </button>
        </form>
      </div>
      
      <div class="modal-footer">
        <button class="switch-mode-btn" @click="toggleMode" type="button">
          {{ isLogin ? 'Need an account? Create one.' : 'Already have an account? Sign in.' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const props = defineProps({
  isVisible: Boolean
});

const emit = defineEmits(['close']);
const authStore = useAuthStore();

const isLogin = ref(true);
const username = ref('');
const password = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    username.value = '';
    password.value = '';
    errorMsg.value = '';
    isLogin.value = true;
  }
});

const close = () => {
  emit('close');
};

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  errorMsg.value = '';
};

const handleSubmit = async () => {
  isLoading.value = true;
  errorMsg.value = '';
  
  try {
    if (isLogin.value) {
      await authStore.login(username.value, password.value);
    } else {
      await authStore.register(username.value, password.value);
    }
    close();
  } catch (err) {
    errorMsg.value = err.message || 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.auth-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-modal {
  width: 100%;
  max-width: 400px;
  background: #fff;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.modal-title {
  font-family: 'Inter', sans-serif;
  font-size: 1.5rem;
  font-weight: 500;
  margin: 0;
  letter-spacing: 1px;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #111;
}

.input-group {
  margin-bottom: 25px;
}

.input-group input {
  width: 100%;
  border: none;
  border-bottom: 1px solid #ddd;
  padding: 10px 0;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.input-group input:focus {
  border-color: #111;
}

.input-group input.has-error {
  border-color: #d92d20;
}

.error-msg {
  color: #d92d20;
  font-size: 0.85rem;
  margin-bottom: 20px;
  font-family: 'Inter', sans-serif;
}

.submit-btn {
  width: 100%;
  background: #111;
  color: #fff;
  border: none;
  padding: 15px 0;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 2px;
  cursor: pointer;
  transition: background 0.3s;
  margin-top: 10px;
}

.submit-btn:hover:not(:disabled) {
  background: #333;
}

.submit-btn:disabled {
  background: #999;
  cursor: not-allowed;
}

.modal-footer {
  margin-top: 25px;
  text-align: center;
}

.switch-mode-btn {
  background: transparent;
  border: none;
  color: #666;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.3s;
}

.switch-mode-btn:hover {
  text-decoration-color: #666;
}
</style>
