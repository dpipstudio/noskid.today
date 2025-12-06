<div align="center">

[![NoSkid Verification](https://noskid.today/badge/100x30/?repo=douxxtech/douxxtech)](https://noskid.today)

# NoSkid.Today - Don't Talk When You Don't Know
</div>

A modern, feature-rich version of [nohello.net](https://nohello.net) with advanced features.
> Do you hate skids ? We do too.

---

## Introduction
NoSkid.Today is a website designed to prevent skids and provide a variety of hidden, advanced features for verified users. It is heavily inspired by [nohello.net](https://nohello.net) but comes with a modern twist.  
The NoSkid Project is a group of every official tool based or using NoSkid services.

## Structure
This repository hosts most NoSkid-related projects, as the main website (`website/`), but also other tools & services (`misc/`).


## Sponsor This Project
Keeping NoSkid.Today online and improving it takes time and resources. Sponsorship helps us cover:  
- Server hosting and maintenance  
- Domain costs  
- Development of new features and hidden goodies  
- Tools and software required for the project  

If you like what we’re doing, consider supporting us! Every contribution helps keep the project alive and growing.  
<div align="center">
<a href="https://github.com/sponsors/dpipstudio"><img src="https://img.shields.io/badge/⭐-Sponsor-yellow?style=for-the-badge" height=50 /></a></div>


> [!TIP]
> Discover hidden features by opening the console (Shift + ESC).  
> Example: Press `Shift + T` to open the comments system: [Comments](https://noskid.today/#spawnCommentSystem)

## Requirements
- PHP with `exec()` and curl enabled.
- librsvg2-bin for SVG to PNG (certificates) conversion. 

## Installation

```bash
sudo apt install librsvg2-bin # assuming you're on debian-based distro, if not install it using your package manager
git clone https://github.com/dpipstudio/noskid.today # clone the repo
cd noskid.today/website # navigate to the websites folder
nano api/config.php # or notepad api/config.php on windows
mysql -u <username> -p <database_name> < ../misc/db_setup/setup.sql # you'll have to setup a sql database before running this
```

> [!TIP]
> For high-quality production content, build the website from source before deploying. See the [build README](/build/readme.md) for detailed instructions.

Run with built-in PHP server:
```bash
php -S 0.0.0.0:80
```
> Or use Apache/Nginx with PHP-FPM.

## Contributing
Contributions are welcome! Check out the list of [contributors](https://github.com/dpipstudio/noskid.today/graphs/contributors) and see how you can help. Thanks to all of them <3

---

## License
Licensed under the [NSDv1.0 License](LICENSE)

## Made by
<a align="center" href="https://github.com/douxxtech" target="_blank">
<img src="https://madeby.douxx.tech"></img>
</a>

<a align="center" href="https://github.com/dpipstudio" target="_blank">
<img src="https://madeby.dpip.lol"></img>
</a>
