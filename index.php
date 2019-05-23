<?php
include('no-cache.php');
header("Content-Type: text/html");
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#FFFFFF" />

    <title>G Routine</title>

    <!-- Bootstrap CSS -->
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet">
    <link href="/css/bootstrap-essentials.min.css" rel="stylesheet">
    <link href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/vue/dist/vue.js">
    </script>
    <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
    <!--[if lt IE 9]>
            <script src="https://oss.maxcdn.com/libs/html5shiv/3.7.3/html5shiv.js"></script>
            <script src="https://oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>
        <![endif]-->
    <style>
        v-cloak {
            display: none;
        }
    </style>
</head>

<body>
    <h1 class="text-center">General Science Challenge</h1>


    <div class="container container-xs" id="app" v-cloak>

        <div class="row">
            <div class="col-xs-12 mb-3">
                <h2 class="text-center">Gaurav</h2>
                <routine-time :tasklist="glist" :lid="'gRoutine'"></routine-time>
            </div>
        </div>

    </div>


    <!-- jQuery -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>
    <!-- Bootstrap JavaScript -->
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.22.2/moment.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.min.js"></script>
    <script>
        Vue.component('routine-time', {
            data: function () {
                return {
                    count: 0,
                    routineData: []
                }
            },
            props: ['tasklist', 'lid'],
            template: `
                <ul class="list-unstyled">
                    <li v-for="task,index in tasklist" class="pt-3 pb-3 bb">
                        <div class="media">
                            <div class="media-left">
                                <button
                                    :idx="index"
                                    type="button"
                                    class="btn btn-circle btn-lg"
                                    :class="{
                                     'btn-default': !task.ticked,
                                     'btn-success': task.ticked,
                                     'btn-danger disabled': task.passed,
                                     'disabled': task.wait,
                                    }"
                                    @click="checkClick">
                                    <span v-if="task.ticked"><i class="fa fa-check"></i></span>
                                    <span v-if="task.passed && !task.ticked"><i class="fa fa-times"></i></span>
                                    <span v-if="!task.ticked && !task.passed && !task.wait"><i class="fa fa-question"></i></span>
                                    <span v-if="task.wait"><i class="fa fa-ellipsis-h"></i></span>
                                </button>
                            </div>
                            <div class="media-body">
                                <h4 class="media-heading">{{task.name}}</h4>
                                <p class="text-muted"><i class="fa fa-clock"></i> {{task.time}}</p>
                            </div>
                        </div>
                    </li>
                </ul>
            `,
            methods: {
                checkClick: function (e) {
                    var taskId = $(e.currentTarget).attr('idx');
                    if (!this.tasklist[taskId].passed && !this.tasklist[taskId].wait) {
                        this.tasklist[taskId].ticked = true;
                        this.updateRoutine();
                    }
                },
                passedTime: function (item) {
                    if (!item.ticked) {
                        var timestamp = moment(item.time, 'HH:mm');
                        exp = timestamp.diff(moment());
                        if (moment.duration(exp).asMinutes() < -30) {
                            item.passed = true;
                        }
                    }
                },
                waitTime: function (item) {
                    if (!item.ticked) {
                        var timestamp = moment(item.time, 'HH:mm');
                        exp = timestamp.diff(moment());
                        if (moment.duration(exp).asMinutes() < 60) {
                            item.wait = false;
                        } else {
                            item.wait = true;
                        }
                    }
                },
                updateRoutine: function () {
                    var lastEntry = this.routineData.length - 1;
                    this.routineData[lastEntry].tasklist = this.tasklist;
                    this.setData();
                },
                initialRoutineSet: function () {
                    return new Promise((resolve) => {
                        this.getData()
                            .then((rData) => {
                                this.routineData = rData.data;
                                var lastEntry = this.routineData.length - 1;
                                console.log(this.routineData);
                                if (!this.routineData.length) {
                                    this.routineData = [{
                                        day: moment().format('DD-MM-YYYY'),
                                        tasklist: this.tasklist
                                    }];
                                    this.setData();
                                } else {
                                    if (typeof this.routineData[lastEntry].day !== 'undefined' && this.routineData[lastEntry].day !== moment().format('DD-MM-YYYY')) {
                                        this.routineData.push({
                                            day: moment().format('DD-MM-YYYY'),
                                            tasklist: this.tasklist
                                        });
                                        this.setData();
                                    } else {
                                        this.tasklist = this.routineData[lastEntry].tasklist;
                                    }
                                }
                                resolve();
                            });
                    });
                },
                getData: function () {
                    return axios.get('/api.php?name=' + this.lid);
                },
                setData: function () {
                    return axios.post('/api.php',
                        new URLSearchParams({
                            name: this.lid,
                            rData: JSON.stringify(this.routineData)
                        }));
                }
            },
            mounted() {
                this.initialRoutineSet()
                    .then(() => {
                        var lastEntry = this.routineData.length - 1;
                        this.tasklist = this.routineData[lastEntry].tasklist;

                        Array.prototype.forEach.call(this.tasklist, task => {
                            this.passedTime(task);
                            this.waitTime(task);
                        });

                        this.updateRoutine();
                    });

                setInterval(function () {
                    // Invoke function every 10 minutes
                    this.updateRoutine();
                }, 600000);
            }
        })
        var app = new Vue({
            el: '#app',
            data: {
                glist: [
                    {
                        name: 'Yoga',
                        time: '7:00',
                        points: 10,
                        ticked: false,
                        passed: false
                    },
                    {
                        name: 'Jogging',
                        time: '7:15',
                        points: 15,
                        ticked: false,
                        passed: false
                    },
                    {
                        name: 'Pre Workout Meal',
                        time: '7:45',
                        points: 5,
                        ticked: false,
                        passed: false
                    },
                    {
                        name: 'Workout',
                        time: '8:30',
                        points: 15,
                        ticked: false,
                        passed: false
                    },
                    {
                        name: 'Reach Office',
                        time: '11:00',
                        points: 20,
                        ticked: false,
                        passed: false
                    },
                    {
                        name: 'Study',
                        time: '19:00',
                        points: 5,
                        ticked: false,
                        passed: false
                    },
                    {
                        name: 'Finish Walk Steps',
                        time: '22:30',
                        points: 5,
                        ticked: false,
                        passed: false
                    },
                    {
                        name: 'Abs Workout',
                        time: '22:45',
                        points: 10,
                        ticked: false,
                        passed: false
                    },
                    {
                        name: 'Sleep',
                        time: '23:15',
                        points: 15,
                        ticked: false,
                        passed: false
                    },
                ]
            }
        });
    </script>

    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js');
            console.log('SW registered');
        }
    </script>
    <script src="service-worker.js"></script>
</body>

</html>

