<template>
  <div class="comment-section">
    <h3>Discussion <span class="comment-count">{{ totalCommentsCount }}</span></h3>
    
    <div class="comment-input-box main-input">
      <div class="avatar-placeholder" v-if="authStore.isAuthenticated">{{ authStore.userInitial }}</div>
      <div class="avatar-placeholder empty" v-else>?</div>
      
      <input 
        type="text" 
        v-model="newComment" 
        placeholder="分享你的见解..." 
        @keyup.enter="submitComment(null)"
      />
      <button @click="submitComment(null)" :disabled="isSubmitting">
        {{ isSubmitting ? '...' : 'PUBLISH' }}
      </button>
    </div>
    
    <div class="loading-state" v-if="isLoading">Loading comments...</div>
    
    <div class="comment-list" v-else>
      <div class="comment-item-wrapper" v-for="comment in comments" :key="comment.id">
        <div class="comment-item">
           <div class="avatar-placeholder small">{{ getInitial(comment.username) }}</div>
           <div class="comment-body">
              <span class="comment-author">{{ comment.username }} <span class="comment-time">{{ formatDate(comment.created_at) }}</span></span>
              <p>{{ comment.content }}</p>
              <button class="reply-btn" @click="toggleReply(comment.id)">Reply</button>
           </div>
        </div>
        
        <!-- 回复输入框 (二级) -->
        <div class="reply-input-wrapper" v-if="activeReplyId === comment.id">
          <div class="comment-input-box reply-input">
            <div class="avatar-placeholder small" v-if="authStore.isAuthenticated">{{ authStore.userInitial }}</div>
            <div class="avatar-placeholder small empty" v-else>?</div>
            <input 
              type="text" 
              v-model="replyContent" 
              :placeholder="`Reply to ${comment.username}...`" 
              ref="replyInputRef"
              @keyup.enter="submitComment(comment.id)"
            />
            <button @click="submitComment(comment.id)" :disabled="isSubmitting">REPLY</button>
          </div>
        </div>
        
        <!-- 二级回复列表 -->
        <div class="replies-list" v-if="comment.replies && comment.replies.length > 0">
          <div class="comment-item reply-item" v-for="reply in comment.replies" :key="reply.id">
             <div class="avatar-placeholder small">{{ getInitial(reply.username) }}</div>
             <div class="comment-body">
                <span class="comment-author">{{ reply.username }} <span class="comment-time">{{ formatDate(reply.created_at) }}</span></span>
                <p>{{ reply.content }}</p>
             </div>
          </div>
        </div>
      </div>
      
      <div v-if="comments.length === 0" class="empty-state">
        Be the first to share your thoughts.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const props = defineProps({
  topicId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['require-login']);

const authStore = useAuthStore();
const comments = ref([]);
const newComment = ref('');
const replyContent = ref('');
const isLoading = ref(true);
const isSubmitting = ref(false);
const activeReplyId = ref(null);
const replyInputRef = ref(null);

const totalCommentsCount = computed(() => {
  let count = 0;
  comments.value.forEach(c => {
    count++;
    if (c.replies) count += c.replies.length;
  });
  return count;
});

const fetchComments = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`http://localhost:3000/api/comments/${props.topicId}`);
    if (response.ok) {
      comments.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch comments', error);
  } finally {
    isLoading.value = false;
  }
};

watch(() => props.topicId, () => {
  fetchComments();
  activeReplyId.value = null;
  newComment.value = '';
  replyContent.value = '';
});

onMounted(() => {
  fetchComments();
});

const getInitial = (username) => {
  return username ? username.charAt(0).toUpperCase() : '?';
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  }).format(date);
};

const toggleReply = (commentId) => {
  if (!authStore.isAuthenticated) {
    emit('require-login');
    return;
  }
  
  if (activeReplyId.value === commentId) {
    activeReplyId.value = null;
  } else {
    activeReplyId.value = commentId;
    replyContent.value = '';
    nextTick(() => {
      if (replyInputRef.value && replyInputRef.value[0]) {
        replyInputRef.value[0].focus();
      }
    });
  }
};

const submitComment = async (parentId = null) => {
  if (!authStore.isAuthenticated) {
    emit('require-login');
    return;
  }

  const content = parentId ? replyContent.value : newComment.value;
  if (!content.trim()) return;

  isSubmitting.value = true;
  try {
    const response = await fetch('http://localhost:3000/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        topic_id: props.topicId,
        content: content,
        parent_id: parentId
      })
    });

    if (response.ok) {
      if (parentId) {
        replyContent.value = '';
        activeReplyId.value = null;
      } else {
        newComment.value = '';
      }
      await fetchComments();
    } else if (response.status === 401 || response.status === 403) {
      authStore.logout();
      emit('require-login');
    }
  } catch (error) {
    console.error('Failed to submit comment', error);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.comment-section h3 {
  font-family: 'Inter', sans-serif; font-size: 1.1rem; color: #111; margin: 0 0 20px 0;
  padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;
}

.comment-count { color: #999; font-size: 0.9rem; font-weight: normal; margin-left: 10px; }

.comment-input-box { display: flex; gap: 15px; margin-bottom: 40px; align-items: center; }
.comment-input-box.reply-input { margin-bottom: 20px; margin-top: 10px; }

.avatar-placeholder { width: 45px; height: 45px; border-radius: 50%; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; font-size: 1.2rem; flex-shrink: 0; }
.avatar-placeholder.empty { background: #f0f0f0; color: #999; }
.avatar-placeholder.small { width: 35px; height: 35px; font-size: 1rem; }

.comment-input-box input { flex: 1; border: none; border-bottom: 1px solid #ddd; padding: 10px 5px; font-family: "Noto Serif SC", serif; font-size: 1rem; outline: none; background: transparent; transition: border-color 0.3s; }
.comment-input-box input:focus { border-color: #111; }
.comment-input-box button { background: #111; color: #fff; border: none; padding: 10px 25px; font-family: 'Inter', sans-serif; font-size: 0.8rem; cursor: pointer; letter-spacing: 1px; transition: opacity 0.3s;}
.comment-input-box button:disabled { opacity: 0.5; cursor: not-allowed; }

.comment-list { display: flex; flex-direction: column; gap: 30px; }
.comment-item-wrapper { display: flex; flex-direction: column; }

.comment-item { display: flex; gap: 15px; }
.comment-body { flex: 1; }
.comment-author { font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 500; color: #111; display: block; margin-bottom: 5px; }
.comment-time { color: #999; font-weight: normal; font-size: 0.8rem; margin-left: 10px; }
.comment-body p { font-size: 1rem; color: #444; margin: 0 0 8px 0; line-height: 1.6; }

.reply-btn { background: transparent; border: none; padding: 0; font-family: 'Inter', sans-serif; font-size: 0.8rem; color: #888; cursor: pointer; transition: color 0.3s; }
.reply-btn:hover { color: #111; }

.reply-input-wrapper {
  padding-left: 50px;
}

.replies-list { 
  display: flex; flex-direction: column; gap: 20px; 
  margin-top: 20px; padding-left: 50px; 
  border-left: 1px solid #eee; margin-left: 17px;
}

.loading-state, .empty-state {
  text-align: center; color: #999; font-style: italic; padding: 20px 0;
  font-family: 'Inter', sans-serif; font-size: 0.9rem;
}
</style>
