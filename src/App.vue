<template>
  <nav class="navbar">
    <div class="nav-container">
      <router-link to="/" class="logo">zentrix566</router-link>
      <div class="nav-links">
        <router-link to="/" class="nav-link">首页</router-link>
        <router-link to="/interval-training" class="nav-link">间歇训练</router-link>
        <router-link to="/tools" class="nav-link">工具</router-link>
        <router-link to="/projects" class="nav-link">项目</router-link>
        <router-link to="/about" class="nav-link">关于</router-link>
      </div>
    </div>
  </nav>
  <main class="main-content">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
  <footer class="footer">
    <p>Made with ❤️ by zentrix566</p>
  </footer>
</template>

<script setup>
</script>

<style scoped>
</style>
