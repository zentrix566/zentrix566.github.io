<template>
  <div class="home-page">
    <div class="hero-section">
      <h1 class="hero-title">zentrix566</h1>
      <p class="hero-subtitle">IT 运维工程师 · 北京</p>
      <div class="hero-description">
        <p>欢迎来到我的个人空间</p>
      </div>
      <div class="quick-links">
        <router-link to="/interval-training" class="quick-link-btn">开始间歇训练 →</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.home-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.hero-section {
  text-align: center;
}

.hero-title {
  font-size: 4rem;
  font-weight: 700;
  letter-spacing: -2px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  font-weight: 400;
  margin-bottom: 32px;
}

.hero-description {
  font-size: 1.125rem;
  color: var(--text-secondary);
  margin-bottom: 48px;
}

.quick-links {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.quick-link-btn {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  background-color: var(--accent);
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: all 0.2s ease;
}

.quick-link-btn:hover {
  background-color: var(--accent-hover);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }
}
</style>
