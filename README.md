# No skid today - please don't talk when you don't know

![togp thing](https://togp.xyz?owner=dpipstudio&repo=noskid.today&theme=json-dark-all&cache=false)

We dont like skids.

A website based on [nohello.net](https://nohello.net), but heavily modified with rich features !

> [!NOTE]
> New feature ! @is.notaskid.ong mails !:  
> Check the [website](https://im.notaskid.ong) ! 
>  
> [![NoSkid Verification](https://noskid.today/badge/100x30/?repo=dpipstudio/noskid.today)](https://noskid.today)


## Hosting this website
> [!TIP]
> To ensure high-quality production content, we recommend building the website from source before deploying it to a web server.
> > Check out the [build README](build/readme.md) for detailed instructions.

It's a php-dependent site, except if you dont want to use the API (that would be sad).  
You also need to install the package `librsvg2-bin` to convert SVG into PNG, and php must have the exec() function allowed.

Installation: 
```shell
git clone https://github.com/dpipstudio/noskid.today
cd noskid.today
php -S 0.0.0.0:80
```
(or use something like apache with php-fpm)
  
Note: i'll >> **maybe** << rewrite the API Backend in JavaScript, if i find the time to do it

> [!WARNING]
> We recently changed our API ! We recommand looking at the change notes:
> [api-changes.md](misc/check.noskid.today/api-changes.md)

> [!TIP]
> This website contains a lot (and really, a lot) of hidden features, find them by looking at the console ! (Shift + ESC)  
> E.G: use [Shift + T to open the comments !](https://noskid.today/#spawnCommentSystem)

## Yapyap
Licensed under the [NSDv1.0 License](LICENSE)

Thanks to all the [contributors](https://github.com/dpipstudio/noskid.today/graphs/contributors) <3

<a align="center" href="https://github.com/douxxtech" target="_blank">
<img src="https://madeby.douxx.tech"></img>
</a>

<a align="center" href="https://github.com/dpipstudio" target="_blank">
<img src="https://madeby.dpip.lol"></img>
</a>

---
Oh yea, i forgot to tell ya, i also hate CI/CD.
