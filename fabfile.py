from fabric.api import env, run, cd, put, local

env.hosts = ['lotus@wallet.lotuscore.io']
env.key_filename = '~/.ssh/id_rsa.pub'
env.forward_agent = True


def update():
    local('yarn build')
    with cd('~/app'):
        run('git pull')
        put('build', '/home/lotus/app/')
        put('build_webpack', '/home/lotus/app/')
