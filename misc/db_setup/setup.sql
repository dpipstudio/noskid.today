-- NoSkid Database Setup
-- This script creates all necessary tables for the NoSkid website
-- Run this script on a fresh database to initialize the system

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;

-- --------------------------------------------------------
-- Achievement System Tables
-- --------------------------------------------------------

-- Table: user_achievements
-- Stores user achievement progress and completion status
CREATE TABLE IF NOT EXISTS `user_achievements` (
  `id` VARCHAR(64) NOT NULL,
  `completed_achievements` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: achievement_temp
-- Tracks achievement start times for time-based achievements
CREATE TABLE IF NOT EXISTS `achievement_temp` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) NOT NULL,
  `achievement_name` VARCHAR(255) NOT NULL,
  `start_time` INT(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_achievement` (`user_id`, `achievement_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Certificate System Tables
-- --------------------------------------------------------

-- Table: cert
-- Stores issued certificates with verification keys
CREATE TABLE IF NOT EXISTS `cert` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `percentage` DECIMAL(5,2) NOT NULL,
  `ip` VARCHAR(45) NOT NULL,
  `verification_key` VARCHAR(255) DEFAULT NULL,
  `achievements_id` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_verification_key` (`verification_key`(64))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: requests
-- Rate limiting table for certificate downloads
CREATE TABLE IF NOT EXISTS `requests` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `ip` VARCHAR(45) NOT NULL,
  `user_agent` TEXT NOT NULL,
  `request_time` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_request_time` (`ip`, `request_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Comments System Tables
-- --------------------------------------------------------

-- Table: comments_posts
-- Stores user comments with reply support
CREATE TABLE IF NOT EXISTS `comments_posts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `author` VARCHAR(100) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `user_fingerprint` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL DEFAULT '0.0.0.0',
  `likes` INT(11) DEFAULT 0,
  `dislikes` INT(11) DEFAULT 0,
  `reply_to` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reply_to` (`reply_to`),
  CONSTRAINT `fk_reply_to` FOREIGN KEY (`reply_to`) REFERENCES `comments_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: comments_reactions
-- Tracks likes and dislikes on comments
CREATE TABLE IF NOT EXISTS `comments_reactions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `comment_id` INT(11) NOT NULL,
  `user_fingerprint` VARCHAR(255) NOT NULL,
  `reaction_type` ENUM('like', 'dislike') NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reaction` (`comment_id`, `user_fingerprint`),
  CONSTRAINT `fk_comment_reaction` FOREIGN KEY (`comment_id`) REFERENCES `comments_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: comments_users
-- Enforces one comment per user per day limit
CREATE TABLE IF NOT EXISTS `comments_users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_fingerprint` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL DEFAULT '0.0.0.0',
  `last_comment_date` DATE NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user` (`user_fingerprint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: comments_blocked_ips
-- Stores blocked IP addresses for comment system
CREATE TABLE IF NOT EXISTS `comments_blocked_ips` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `ip_address` VARCHAR(45) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ip` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;